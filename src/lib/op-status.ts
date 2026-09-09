import { prisma } from "./prisma";
import { leseFortschritt, openprojectKonfiguriert } from "./openproject";

// Status-Rücklesen aus OpenProject (Konzept 4.7/7): einseitig, nur lesen.
// Wird über einen Admin-Button oder den Job /api/jobs/op-status angestoßen.

export interface FortschrittLauf {
  geprueft: number;
  geaendert: number;
  fehler: number;
}

/** Liest den Status eines einzelnen Use Case aus OpenProject und speichert ihn. */
export async function aktualisiereFortschritt(
  useCaseId: string,
): Promise<{ ok: boolean; name?: string | null; fehler?: string }> {
  const uc = await prisma.useCase.findUnique({ where: { id: useCaseId } });
  if (!uc?.openprojectWpId) {
    return { ok: false, fehler: "Noch nicht nach OpenProject übertragen." };
  }
  if (!openprojectKonfiguriert()) {
    return { ok: false, fehler: "OpenProject ist nicht konfiguriert." };
  }

  const res = await leseFortschritt(uc.openprojectWpId);
  if (!res) {
    return { ok: false, fehler: "Status konnte nicht gelesen werden." };
  }

  await prisma.useCase.update({
    where: { id: useCaseId },
    data: {
      openprojectStatusKey: res.key,
      openprojectStatusName: res.name,
      openprojectStatusAt: new Date(),
    },
  });
  return { ok: true, name: res.name };
}

/** Liest den Status aller übertragenen Use Cases. */
export async function aktualisiereAlleFortschritte(): Promise<FortschrittLauf> {
  const lauf: FortschrittLauf = { geprueft: 0, geaendert: 0, fehler: 0 };
  if (!openprojectKonfiguriert()) return lauf;

  const offene = await prisma.useCase.findMany({
    where: { openprojectWpId: { not: null } },
    select: { id: true, openprojectWpId: true, openprojectStatusName: true },
  });

  for (const uc of offene) {
    lauf.geprueft++;
    const res = await leseFortschritt(uc.openprojectWpId!);
    if (!res) {
      lauf.fehler++;
      continue;
    }
    if (res.name !== uc.openprojectStatusName) lauf.geaendert++;
    await prisma.useCase.update({
      where: { id: uc.id },
      data: {
        openprojectStatusKey: res.key,
        openprojectStatusName: res.name,
        openprojectStatusAt: new Date(),
      },
    });
  }
  return lauf;
}
