import { prisma } from "./prisma";

// Priorisierungsmodus (Konzept Abschnitt 10). Auswertung der abgegebenen Stimmen.

export type Verteilung = Record<string, number>;

/** Prüft eine Budgetverteilung gegen das erlaubte Gesamtbudget. */
export function verteilungGueltig(
  verteilung: Verteilung,
  erlaubteIds: string[],
  budget: number,
): { ok: boolean; summe: number; fehler?: string } {
  let summe = 0;
  for (const [id, betrag] of Object.entries(verteilung)) {
    if (!erlaubteIds.includes(id)) {
      return { ok: false, summe, fehler: "Unbekannte Karte in der Verteilung." };
    }
    if (!Number.isFinite(betrag) || betrag < 0) {
      return { ok: false, summe, fehler: "Ungültiger Betrag." };
    }
    summe += betrag;
  }
  if (summe > budget) {
    return { ok: false, summe, fehler: `Sie haben ${summe} € verteilt, erlaubt sind ${budget} €.` };
  }
  return { ok: true, summe };
}

export interface PrioErgebnisZeile {
  useCaseId: string;
  titel: string;
  summe: number;
  anteil: number; // 0..1 am gesamten verteilten Budget
  stimmen: number; // Anzahl Teilnehmer, die etwas zugeteilt haben
}

export interface PrioAuswertung {
  teilnehmer: number;
  budgetGesamt: number;
  verteiltGesamt: number;
  zeilen: PrioErgebnisZeile[];
}

export async function werteRundeAus(prioRundeId: string): Promise<PrioAuswertung | null> {
  const runde = await prisma.prioRunde.findUnique({
    where: { id: prioRundeId },
    include: { stimmen: true },
  });
  if (!runde) return null;

  const ids = (runde.useCaseIds as string[]) ?? [];
  const useCases = await prisma.useCase.findMany({
    where: { id: { in: ids } },
    select: { id: true, titel: true, problemText: true },
  });
  const titelVon = new Map(
    useCases.map((u) => [u.id, u.titel || u.problemText.slice(0, 60)]),
  );

  const summen = new Map<string, number>();
  const stimmenAnzahl = new Map<string, number>();
  let verteiltGesamt = 0;

  for (const stimme of runde.stimmen) {
    const v = (stimme.verteilung as Verteilung) ?? {};
    for (const [id, betrag] of Object.entries(v)) {
      if (!ids.includes(id) || !(betrag > 0)) continue;
      summen.set(id, (summen.get(id) ?? 0) + betrag);
      stimmenAnzahl.set(id, (stimmenAnzahl.get(id) ?? 0) + 1);
      verteiltGesamt += betrag;
    }
  }

  const zeilen: PrioErgebnisZeile[] = ids
    .map((id) => {
      const summe = summen.get(id) ?? 0;
      return {
        useCaseId: id,
        titel: titelVon.get(id) ?? id,
        summe,
        anteil: verteiltGesamt > 0 ? summe / verteiltGesamt : 0,
        stimmen: stimmenAnzahl.get(id) ?? 0,
      };
    })
    .sort((a, b) => b.summe - a.summe);

  return {
    teilnehmer: runde.stimmen.length,
    budgetGesamt: runde.stimmen.length * runde.budgetProTeilnehmer,
    verteiltGesamt,
    zeilen,
  };
}
