"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { berechnePotenzial, type Frequenz } from "@/lib/potential";
import { resolveTenant } from "@/lib/tenant";
import { tenantDb } from "@/lib/tenant-db";
import { kurzerfassungSchema } from "@/lib/validation";
import { sendeMagicLink } from "@/lib/magic-link";
import { prisma } from "@/lib/prisma";
import { audit, clientIp } from "@/lib/audit";
import { bereinigeRateLimitStore, rateLimit } from "@/lib/rate-limit";
import { KI_HINWEIS_VERSION, kiKonfiguriert } from "@/lib/ki";
import { starteAnreicherung } from "@/lib/ki-enrichment";

/**
 * Prüft die vom Client gemeldete KI-Einwilligung serverseitig (Konzept 4.6):
 * gültig nur bei passender Hinweis-Version, global konfiguriertem Anbieter UND
 * für diesen Kunden freigeschalteter KI-Aufbereitung.
 */
function pruefeEinwilligung(formData: FormData, kiAktiviert: boolean): boolean {
  return (
    formData.get("kiEinwilligung") === "on" &&
    formData.get("kiHinweisVersion") === KI_HINWEIS_VERSION &&
    kiKonfiguriert() &&
    kiAktiviert
  );
}

export interface FormState {
  ok: boolean;
  fehler?: string;
  feldFehler?: Record<string, string>;
}

function feldFehler(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Stufe-1-Kurzerfassung entgegennehmen (Konzept Abschnitt 4.2). */
export async function submitKurzerfassung(
  slug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await resolveTenant(slug);
  if (!ctx) {
    return { ok: false, fehler: "Ihr Zugang ist abgelaufen. Bitte öffnen Sie den Einladungslink erneut." };
  }

  bereinigeRateLimitStore();
  const ip = (await clientIp()) ?? "unbekannt";
  const rl = rateLimit(`einreichung:${ctx.id}:${ip}`, 10, 600);
  if (!rl.ok) {
    return {
      ok: false,
      fehler: `Zu viele Einreichungen in kurzer Zeit. Bitte in ${Math.ceil(rl.resetInSekunden / 60)} Minuten erneut versuchen.`,
    };
  }

  const istAnonym = formData.get("istAnonym") === "on";
  const roh = {
    problemText: formData.get("problemText"),
    rolle: formData.get("rolle"),
    anzahlBetroffene: formData.get("anzahlBetroffene"),
    frequenz: formData.get("frequenz"),
    dauerMinuten: formData.get("dauerMinuten"),
    wunschergebnis: formData.get("wunschergebnis"),
    einreicherName: istAnonym ? "" : formData.get("einreicherName"),
    einreicherEmail: istAnonym ? "" : formData.get("einreicherEmail"),
    istAnonym,
  };

  const parsed = kurzerfassungSchema.safeParse(roh);
  if (!parsed.success) {
    return { ok: false, feldFehler: feldFehler(parsed.error) };
  }
  const d = parsed.data;

  // Potenzial serverseitig neu berechnen — Client-Werten wird nicht vertraut.
  const potenzial = berechnePotenzial({
    frequenz: d.frequenz as Frequenz,
    anzahlBetroffene: d.anzahlBetroffene,
    dauerMinuten: d.dauerMinuten,
  });
  if (!potenzial) {
    return { ok: false, fehler: "Die Angaben zu Häufigkeit, Dauer und Anzahl ergeben kein plausibles Potenzial." };
  }

  const kiEinwilligung = pruefeEinwilligung(formData, ctx.kiAktiviert);

  const useCase = await tenantDb(ctx.id).useCase.create({
    problemText: d.problemText,
    wunschergebnis: d.wunschergebnis ?? null,
    rolle: d.rolle,
    anzahlBetroffene: d.anzahlBetroffene,
    frequenz: d.frequenz,
    dauerMinuten: d.dauerMinuten,
    stundenpotenzialPa: potenzial.stundenpotenzialPa,
    reifegrad: "KURZ",
    status: "EINGEREICHT",
    einreicherName: d.einreicherName ?? null,
    einreicherEmail: d.einreicherEmail ?? null,
    istAnonym: d.istAnonym ?? false,
    kiEinwilligung,
    kiEinwilligungAm: kiEinwilligung ? new Date() : null,
    kiHinweisVersion: kiEinwilligung ? KI_HINWEIS_VERSION : null,
  });

  if (kiEinwilligung) {
    await starteAnreicherung(useCase.id, ctx.id).catch((e) =>
      console.error("KI-Anreicherung konnte nicht gestartet werden:", e),
    );
  }

  if (d.einreicherEmail && !d.istAnonym) {
    // Nicht auf den SMTP-Versand warten — ein langsamer Mailserver darf die
    // Einreichung nicht blockieren. Fehler landen im Log (mailer.ts hat ein
    // eigenes Timeout).
    void sendeMagicLink(useCase.id, d.einreicherEmail).catch((e) =>
      console.error("Magic-Link-Versand fehlgeschlagen:", e),
    );
  }

  await audit({
    actor: "einreicher",
    aktion: "use_case.eingereicht",
    zielTyp: "use_case",
    zielId: useCase.id,
    tenantId: ctx.id,
    detail: { anonym: d.istAnonym ?? false, stundenpotenzialPa: potenzial.stundenpotenzialPa },
  });

  redirect(
    `/${slug}/danke?h=${potenzial.stundenpotenzialPa}&uc=${useCase.id}`,
  );
}

const ergaenzenSchema = kurzerfassungSchema;

/** Bestehenden Entwurf ueber Magic Link ergaenzen. */
export async function ergaenzeKurzerfassung(
  useCaseId: string,
  slug: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const bestehend = await prisma.useCase.findUnique({
    where: { id: useCaseId },
    include: { tenant: true },
  });
  if (!bestehend || bestehend.tenant.slug !== slug) {
    return { ok: false, fehler: "Der Eintrag wurde nicht gefunden." };
  }

  const istAnonym = formData.get("istAnonym") === "on";
  const parsed = ergaenzenSchema.safeParse({
    problemText: formData.get("problemText"),
    rolle: formData.get("rolle"),
    anzahlBetroffene: formData.get("anzahlBetroffene"),
    frequenz: formData.get("frequenz"),
    dauerMinuten: formData.get("dauerMinuten"),
    wunschergebnis: formData.get("wunschergebnis"),
    einreicherName: istAnonym ? "" : formData.get("einreicherName"),
    einreicherEmail: istAnonym ? "" : formData.get("einreicherEmail"),
    istAnonym,
  });
  if (!parsed.success) {
    return { ok: false, feldFehler: feldFehler(parsed.error) };
  }
  const d = parsed.data;
  const potenzial = berechnePotenzial({
    frequenz: d.frequenz as Frequenz,
    anzahlBetroffene: d.anzahlBetroffene,
    dauerMinuten: d.dauerMinuten,
  });
  if (!potenzial) {
    return { ok: false, fehler: "Die Angaben ergeben kein plausibles Potenzial." };
  }

  // KI-Einwilligung kann beim Ergänzen erstmals erteilt werden (nicht widerrufen).
  const neuEinwilligung =
    !bestehend.kiEinwilligung &&
    !bestehend.kiEinwilligungWiderrufenAm &&
    pruefeEinwilligung(formData, bestehend.tenant.kiAktiviert);

  await prisma.useCase.update({
    where: { id: useCaseId },
    data: {
      problemText: d.problemText,
      wunschergebnis: d.wunschergebnis ?? null,
      rolle: d.rolle,
      anzahlBetroffene: d.anzahlBetroffene,
      frequenz: d.frequenz,
      dauerMinuten: d.dauerMinuten,
      stundenpotenzialPa: potenzial.stundenpotenzialPa,
      einreicherName: d.einreicherName ?? null,
      einreicherEmail: d.einreicherEmail ?? bestehend.einreicherEmail,
      istAnonym: d.istAnonym ?? false,
      ...(neuEinwilligung
        ? {
            kiEinwilligung: true,
            kiEinwilligungAm: new Date(),
            kiHinweisVersion: KI_HINWEIS_VERSION,
          }
        : {}),
    },
  });

  if (neuEinwilligung) {
    await starteAnreicherung(useCaseId, bestehend.tenantId).catch((e) =>
      console.error("KI-Anreicherung konnte nicht gestartet werden:", e),
    );
  }

  redirect(
    `/${slug}/danke?h=${potenzial.stundenpotenzialPa}&ergaenzt=1&uc=${useCaseId}`,
  );
}

/** KI-Aufbereitung widerrufen (Konzept 4.6). Erreichbar über den Magic Link. */
export async function widerrufeKiEinwilligung(
  useCaseId: string,
  slug: string,
): Promise<void> {
  const ctx = await resolveTenant(slug);
  if (!ctx) return;
  const uc = await prisma.useCase.findUnique({
    where: { id: useCaseId },
    select: { tenantId: true },
  });
  if (!uc || uc.tenantId !== ctx.id) return;

  const { widerrufeEinwilligung } = await import("@/lib/ki-enrichment");
  await widerrufeEinwilligung(useCaseId, "einreicher");
  redirect(`/${slug}/bearbeiten/${useCaseId}?ki=widerrufen`);
}
