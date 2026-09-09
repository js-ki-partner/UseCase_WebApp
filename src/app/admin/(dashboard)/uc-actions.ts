"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { syncUseCase } from "@/lib/openproject";
import {
  aktualisiereAlleFortschritte,
  aktualisiereFortschritt,
} from "@/lib/op-status";
import { audit } from "@/lib/audit";

export interface UcActionState {
  ok?: boolean;
  fehler?: string;
  hinweis?: string;
}

export async function setzeStatus(
  useCaseId: string,
  status: string,
): Promise<void> {
  await requireAdmin();
  await prisma.useCase.update({
    where: { id: useCaseId },
    data: { status: status as never },
  });
  revalidatePath(`/admin/uc/${useCaseId}`);
  revalidatePath("/admin");
}

export async function speichereFelder(
  useCaseId: string,
  _prev: UcActionState,
  formData: FormData,
): Promise<UcActionState> {
  await requireAdmin();
  const titel = String(formData.get("titel") ?? "").trim();
  const notizIntern = String(formData.get("notizIntern") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  await prisma.useCase.update({
    where: { id: useCaseId },
    data: {
      titel: titel || null,
      notizIntern: notizIntern || null,
      ...(status ? { status: status as never } : {}),
    },
  });
  revalidatePath(`/admin/uc/${useCaseId}`);
  revalidatePath("/admin");
  return { ok: true, hinweis: "Gespeichert." };
}

export async function markiereDuplikat(
  useCaseId: string,
  _prev: UcActionState,
  formData: FormData,
): Promise<UcActionState> {
  await requireAdmin();
  const fuehrendId = String(formData.get("fuehrendId") ?? "").trim();
  if (!fuehrendId) return { fehler: "Bitte den führenden Eintrag angeben." };
  if (fuehrendId === useCaseId) {
    return { fehler: "Ein Eintrag kann nicht sein eigenes Duplikat sein." };
  }
  const fuehrend = await prisma.useCase.findUnique({ where: { id: fuehrendId } });
  const dieser = await prisma.useCase.findUnique({ where: { id: useCaseId } });
  if (!fuehrend || !dieser || fuehrend.tenantId !== dieser.tenantId) {
    return { fehler: "Der führende Eintrag gehört nicht zum selben Kunden." };
  }
  await prisma.useCase.update({
    where: { id: useCaseId },
    data: { duplikatVonId: fuehrendId, status: "DUPLIKAT" as never },
  });
  revalidatePath(`/admin/uc/${useCaseId}`);
  revalidatePath("/admin");
  return { ok: true, hinweis: "Als Duplikat markiert." };
}

export async function hebeDuplikatAuf(useCaseId: string): Promise<void> {
  await requireAdmin();
  await prisma.useCase.update({
    where: { id: useCaseId },
    data: { duplikatVonId: null, status: "EINGEREICHT" as never },
  });
  revalidatePath(`/admin/uc/${useCaseId}`);
}

/** Nach OpenProject uebertragen (idempotent, Konzept Abschnitt 7). */
export async function uebertrageNachOpenProject(
  useCaseId: string,
): Promise<UcActionState> {
  const admin = await requireAdmin();
  const uc = await prisma.useCase.findUnique({
    where: { id: useCaseId },
    include: {
      tenant: true,
      processSteps: { orderBy: { position: "asc" } },
      aiEnrichment: true,
      assessment: true,
    },
  });
  if (!uc) return { fehler: "Use Case nicht gefunden." };
  if (uc.status === "DUPLIKAT") {
    return { fehler: "Duplikate werden nicht übertragen." };
  }

  try {
    const res = await syncUseCase({
      tenant: uc.tenant,
      useCase: uc,
      steps: uc.processSteps,
      assessment: uc.assessment,
      aiEnrichment: uc.aiEnrichment,
    });
    await prisma.useCase.update({
      where: { id: useCaseId },
      data: {
        openprojectWpId: res.wpId,
        openprojectLockVersion: res.lockVersion,
        syncStatus: "OK",
        syncFehler: null,
        syncedAt: new Date(),
        status: "UEBERTRAGEN" as never,
      },
    });
    await audit({
      actor: `admin:${admin.id}`,
      aktion: "openproject.sync",
      zielTyp: "use_case",
      zielId: useCaseId,
      tenantId: uc.tenantId,
      detail: { ergebnis: "ok", wpId: res.wpId },
    });
    // Direkt den aktuellen Status zurücklesen (best effort).
    await aktualisiereFortschritt(useCaseId).catch(() => undefined);
    revalidatePath(`/admin/uc/${useCaseId}`);
    revalidatePath("/admin");
    return { ok: true, hinweis: `Work Package #${res.wpId} aktualisiert.` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    await prisma.useCase.update({
      where: { id: useCaseId },
      data: { syncStatus: "FEHLER", syncFehler: msg },
    });
    await audit({
      actor: `admin:${admin.id}`,
      aktion: "openproject.sync",
      zielTyp: "use_case",
      zielId: useCaseId,
      tenantId: uc.tenantId,
      detail: { ergebnis: "fehler", meldung: msg },
    });
    revalidatePath(`/admin/uc/${useCaseId}`);
    return { fehler: `Übertragung fehlgeschlagen: ${msg}` };
  }
}

/** Status eines Use Case aus OpenProject zurücklesen (Konzept 4.7/7). */
export async function fortschrittAktualisieren(
  useCaseId: string,
): Promise<UcActionState> {
  await requireAdmin();
  const res = await aktualisiereFortschritt(useCaseId);
  revalidatePath(`/admin/uc/${useCaseId}`);
  revalidatePath("/admin");
  if (!res.ok) return { fehler: res.fehler };
  return { ok: true, hinweis: `Status aus OpenProject: ${res.name ?? "unbekannt"}.` };
}

/** Status aller übertragenen Use Cases zurücklesen. */
export async function alleFortschritteAktualisieren(): Promise<UcActionState> {
  const admin = await requireAdmin();
  const lauf = await aktualisiereAlleFortschritte();
  await audit({
    actor: `admin:${admin.id}`,
    aktion: "openproject.status_rueckgelesen",
    detail: { ...lauf },
  });
  revalidatePath("/admin");
  return {
    ok: true,
    hinweis: `${lauf.geprueft} geprüft, ${lauf.geaendert} geändert${lauf.fehler ? `, ${lauf.fehler} Fehler` : ""}.`,
  };
}

// --- KI-Anreicherung (Konzept 4.6) ---

export async function anreicherungUebernehmen(
  useCaseId: string,
): Promise<UcActionState> {
  const admin = await requireAdmin();
  const uc = await prisma.useCase.findUnique({
    where: { id: useCaseId },
    include: { aiEnrichment: true },
  });
  if (!uc?.aiEnrichment) return { fehler: "Keine Anreicherung vorhanden." };

  await prisma.useCase.update({
    where: { id: useCaseId },
    data: {
      ...(!uc.titel && uc.aiEnrichment.titelVorschlag
        ? { titel: uc.aiEnrichment.titelVorschlag }
        : {}),
    },
  });
  await prisma.aiEnrichment.update({
    where: { useCaseId },
    data: { geprueft: true },
  });
  await audit({
    actor: `admin:${admin.id}`,
    aktion: "ki.vorschlag_geprueft",
    zielTyp: "use_case",
    zielId: useCaseId,
    tenantId: uc.tenantId,
    detail: { uebernommen: true },
  });
  revalidatePath(`/admin/uc/${useCaseId}`);
  return { ok: true, hinweis: "Übernommen und als geprüft markiert." };
}

export async function anreicherungAlsGeprueft(
  useCaseId: string,
): Promise<UcActionState> {
  const admin = await requireAdmin();
  const uc = await prisma.useCase.findUnique({
    where: { id: useCaseId },
    select: { tenantId: true },
  });
  await prisma.aiEnrichment.update({
    where: { useCaseId },
    data: { geprueft: true },
  });
  await audit({
    actor: `admin:${admin.id}`,
    aktion: "ki.vorschlag_geprueft",
    zielTyp: "use_case",
    zielId: useCaseId,
    tenantId: uc?.tenantId,
    detail: { uebernommen: false },
  });
  revalidatePath(`/admin/uc/${useCaseId}`);
  return { ok: true, hinweis: "Als geprüft markiert." };
}

export async function anreicherungErneut(
  useCaseId: string,
): Promise<UcActionState> {
  await requireAdmin();
  const { verarbeiteAnreicherung } = await import("@/lib/ki-enrichment");
  await prisma.aiEnrichment.updateMany({
    where: { useCaseId },
    data: { status: "WARTEND", geprueft: false, fehler: null },
  });
  await verarbeiteAnreicherung(useCaseId);
  revalidatePath(`/admin/uc/${useCaseId}`);
  return { ok: true, hinweis: "Neu verarbeitet." };
}
