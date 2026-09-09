"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveTenant } from "@/lib/tenant";
import { prozessschritteSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { bereinigeRateLimitStore, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/audit";

export interface ProzessFormState {
  ok: boolean;
  fehler?: string;
}

/**
 * Ersetzt die Prozessschritte eines Use Case (Stufe 2, Konzept 4.3).
 * Erreichbar über die Danke-Seite oder den Magic Link, auch von einer
 * anderen Person als der Ersteinreicher ("progressive Vertiefung").
 */
export async function speichereProzessschritte(
  useCaseId: string,
  slug: string,
  _prev: ProzessFormState,
  formData: FormData,
): Promise<ProzessFormState> {
  const ctx = await resolveTenant(slug);
  if (!ctx) {
    return { ok: false, fehler: "Ihr Zugang ist abgelaufen. Bitte öffnen Sie den Link erneut." };
  }

  const useCase = await prisma.useCase.findUnique({ where: { id: useCaseId } });
  if (!useCase || useCase.tenantId !== ctx.id) {
    return { ok: false, fehler: "Der Eintrag wurde nicht gefunden." };
  }

  bereinigeRateLimitStore();
  const ip = (await clientIp()) ?? "unbekannt";
  if (!rateLimit(`prozess:${ctx.id}:${ip}`, 30, 600).ok) {
    return { ok: false, fehler: "Zu viele Speichervorgänge. Bitte kurz warten." };
  }

  // formData: schritt[i][feld]
  const roh: Record<number, Record<string, unknown>> = {};
  for (const [key, value] of formData.entries()) {
    const m = key.match(/^schritt\[(\d+)\]\[(\w+)\]$/);
    if (!m) continue;
    const idx = Number(m[1]);
    (roh[idx] ??= {})[m[2]] =
      m[2] === "hatWartezeit" || m[2] === "brauchtEntscheidung"
        ? value === "on"
        : value;
  }

  const eingaben = Object.keys(roh)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => roh[Number(k)])
    .filter((s) => String(s.bezeichnung ?? "").trim().length > 0);

  const parsed = prozessschritteSchema.safeParse(eingaben);
  if (!parsed.success) {
    return {
      ok: false,
      fehler: parsed.error.issues[0]?.message ?? "Bitte die Eingaben prüfen.",
    };
  }

  await prisma.$transaction([
    prisma.processStep.deleteMany({ where: { useCaseId } }),
    ...parsed.data.map((s, i) =>
      prisma.processStep.create({
        data: {
          useCaseId,
          position: i + 1,
          bezeichnung: s.bezeichnung,
          input: s.input ?? null,
          output: s.output ?? null,
          system: s.system ?? null,
          dauerMinuten: typeof s.dauerMinuten === "number" ? s.dauerMinuten : null,
          hatWartezeit: s.hatWartezeit ?? false,
          brauchtEntscheidung: s.brauchtEntscheidung ?? false,
        },
      }),
    ),
    prisma.useCase.update({
      where: { id: useCaseId },
      data: {
        reifegrad: parsed.data.length > 0 ? "PROZESS" : "KURZ",
      },
    }),
  ]);

  await audit({
    actor: "einreicher",
    aktion: "use_case.prozess_erfasst",
    zielTyp: "use_case",
    zielId: useCaseId,
    tenantId: ctx.id,
    detail: { schritte: parsed.data.length },
  });

  redirect(`/${slug}/danke?prozess=${parsed.data.length}`);
}
