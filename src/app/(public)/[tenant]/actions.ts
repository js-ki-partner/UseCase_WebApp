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
  });

  if (d.einreicherEmail && !d.istAnonym) {
    try {
      await sendeMagicLink(useCase.id, d.einreicherEmail);
    } catch (e) {
      console.error("Magic-Link-Versand fehlgeschlagen:", e);
    }
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
    },
  });

  redirect(
    `/${slug}/danke?h=${potenzial.stundenpotenzialPa}&ergaenzt=1&uc=${useCaseId}`,
  );
}
