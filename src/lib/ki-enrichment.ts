import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { audit } from "./audit";
import {
  KI_HINWEIS_VERSION,
  UEBERMITTELTE_FELDER,
  filtereNutzlast,
  kiKonfiguriert,
} from "./ki";
import { getKiProvider } from "./ki-provider";
import { findeAehnliche } from "./ki-similarity";

// Verarbeitungs-Pipeline der KI-Anreicherung (Konzept 4.6):
//  - vor jeder Ausführung erneut gegen den gespeicherten Einwilligungssatz prüfen
//  - Filterschicht entfernt Identitätsfelder vor dem Versand
//  - jeder Versand wird protokolliert (ohne Inhalt)
//  - die Ähnlichkeitsprüfung läuft immer lokal, auch ohne Einwilligung

/** Legt den Auftrag an (Status WARTEND) und stößt die Verarbeitung an. */
export async function starteAnreicherung(
  useCaseId: string,
  tenantId: string,
): Promise<void> {
  await prisma.aiEnrichment.upsert({
    where: { useCaseId },
    create: { useCaseId, status: "WARTEND" },
    update: { status: "WARTEND", fehler: null },
  });
  await audit({
    actor: "einreicher",
    aktion: "ki.einwilligung_erteilt",
    zielTyp: "use_case",
    zielId: useCaseId,
    tenantId,
    detail: { hinweisVersion: KI_HINWEIS_VERSION },
  });
  // Best effort: sofort verarbeiten. Bleibt es bei WARTEND, holt der Job es nach.
  await verarbeiteAnreicherung(useCaseId).catch((e) =>
    console.error("KI-Anreicherung (inline) fehlgeschlagen:", e),
  );
}

/**
 * Gültige, nicht widerrufene Einwilligung mit passender Hinweis-Version?
 * Ein manipulierter Client darf keine Verarbeitung auslösen (Konzept 4.6).
 */
function einwilligungGueltig(uc: {
  kiEinwilligung: boolean;
  kiEinwilligungWiderrufenAm: Date | null;
  kiHinweisVersion: string | null;
}): boolean {
  return (
    uc.kiEinwilligung &&
    !uc.kiEinwilligungWiderrufenAm &&
    uc.kiHinweisVersion === KI_HINWEIS_VERSION &&
    kiKonfiguriert()
  );
}

export async function verarbeiteAnreicherung(useCaseId: string): Promise<void> {
  const uc = await prisma.useCase.findUnique({
    where: { id: useCaseId },
    include: { processSteps: { orderBy: { position: "asc" } } },
  });
  if (!uc) return;

  // Ähnlichkeit immer lokal ermitteln (unabhängig von der Einwilligung).
  const treffer = await findeAehnliche(uc.tenantId, useCaseId).catch(() => []);
  const aehnliche = treffer as unknown as Prisma.InputJsonValue;

  if (!einwilligungGueltig(uc)) {
    await prisma.aiEnrichment.upsert({
      where: { useCaseId },
      create: {
        useCaseId,
        status: "UEBERSPRUNGEN",
        aehnlicheUseCases: aehnliche,
        verarbeitungLokal: true,
        verarbeitetAm: new Date(),
      },
      update: {
        status: "UEBERSPRUNGEN",
        aehnlicheUseCases: aehnliche,
        verarbeitetAm: new Date(),
      },
    });
    return;
  }

  const provider = getKiProvider();
  if (!provider) {
    await prisma.aiEnrichment.update({
      where: { useCaseId },
      data: {
        status: "FEHLER",
        fehler: "Kein KI-Anbieter konfiguriert.",
        aehnlicheUseCases: aehnliche,
        verarbeitetAm: new Date(),
      },
    });
    return;
  }

  // Filterschicht: Nutzlast OHNE Identitätsfelder.
  const nutzlast = filtereNutzlast(uc, uc.processSteps);

  try {
    const ergebnis = await provider.anreichern(nutzlast);

    await prisma.aiEnrichment.update({
      where: { useCaseId },
      data: {
        status: "OK",
        fehler: null,
        titelVorschlag: ergebnis.titelVorschlag,
        kategorie: ergebnis.kategorie,
        extrahierteSysteme: ergebnis.extrahierteSysteme,
        aehnlicheUseCases: aehnliche,
        anbieter: provider.name,
        modell: provider.modell,
        verarbeitungLokal: false,
        verarbeitetAm: new Date(),
      },
    });

    await prisma.aiTransferLog.create({
      data: {
        useCaseId,
        tenantId: uc.tenantId,
        anbieter: provider.name,
        modell: provider.modell,
        uebermittelteFelder: [...UEBERMITTELTE_FELDER],
        hinweisVersion: KI_HINWEIS_VERSION,
        ergebnis: "ok",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
    await prisma.aiEnrichment.update({
      where: { useCaseId },
      data: {
        status: "FEHLER",
        fehler: msg,
        aehnlicheUseCases: aehnliche,
        anbieter: provider.name,
        modell: provider.modell,
        verarbeitetAm: new Date(),
      },
    });
    await prisma.aiTransferLog.create({
      data: {
        useCaseId,
        tenantId: uc.tenantId,
        anbieter: provider.name,
        modell: provider.modell,
        uebermittelteFelder: [...UEBERMITTELTE_FELDER],
        hinweisVersion: KI_HINWEIS_VERSION,
        ergebnis: "fehler",
      },
    });
  }
}

/** Alle wartenden Aufträge abarbeiten (für den Job-Endpunkt). */
export async function verarbeiteWartende(): Promise<{
  verarbeitet: number;
  fehler: number;
}> {
  const offen = await prisma.aiEnrichment.findMany({
    where: { status: "WARTEND" },
    select: { useCaseId: true },
    take: 50,
  });
  let fehler = 0;
  for (const o of offen) {
    try {
      await verarbeiteAnreicherung(o.useCaseId);
    } catch {
      fehler++;
    }
  }
  return { verarbeitet: offen.length, fehler };
}

/**
 * Widerruf (Konzept 4.6): erzeugte Anreicherungen löschen, Einreichung bleibt.
 * Das Versandprotokoll (AiTransferLog) bleibt für die Auskunft erhalten.
 */
export async function widerrufeEinwilligung(
  useCaseId: string,
  actor: string,
): Promise<void> {
  const uc = await prisma.useCase.findUnique({
    where: { id: useCaseId },
    select: { tenantId: true, kiEinwilligung: true },
  });
  if (!uc) return;

  await prisma.$transaction([
    prisma.aiEnrichment.deleteMany({ where: { useCaseId } }),
    prisma.useCase.update({
      where: { id: useCaseId },
      data: { kiEinwilligungWiderrufenAm: new Date() },
    }),
  ]);
  await audit({
    actor,
    aktion: "ki.einwilligung_widerrufen",
    zielTyp: "use_case",
    zielId: useCaseId,
    tenantId: uc.tenantId,
  });
}
