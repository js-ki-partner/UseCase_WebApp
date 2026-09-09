"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resolveKontakt } from "@/lib/kontakt";
import { audit } from "@/lib/audit";

export interface KontextState {
  ok: boolean;
  fehler?: string;
  hinweis?: string;
}

/** Der Ansprechpartner ergänzt Kontext zu einer Einreichung (Konzept Abschnitt 3). */
export async function speichereKontext(
  useCaseId: string,
  slug: string,
  _prev: KontextState,
  formData: FormData,
): Promise<KontextState> {
  const ctx = await resolveKontakt(slug);
  if (!ctx) return { ok: false, fehler: "Ihr Zugang ist abgelaufen." };

  const uc = await prisma.useCase.findUnique({
    where: { id: useCaseId },
    select: { tenantId: true },
  });
  if (!uc || uc.tenantId !== ctx.tenant.id) {
    return { ok: false, fehler: "Der Eintrag wurde nicht gefunden." };
  }

  const text = String(formData.get("kundenkontext") ?? "").trim().slice(0, 4000);
  await prisma.useCase.update({
    where: { id: useCaseId },
    data: { kundenkontext: text || null },
  });
  await audit({
    actor: `kontakt:${ctx.kontaktId}`,
    aktion: "use_case.kontext_ergaenzt",
    zielTyp: "use_case",
    zielId: useCaseId,
    tenantId: ctx.tenant.id,
  });

  revalidatePath(`/${slug}/dashboard`);
  return { ok: true, hinweis: "Gespeichert." };
}
