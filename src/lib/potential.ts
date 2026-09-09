// Berechnungslogik — siehe konzept-use-case-erfassungg.md Abschnitt 4.5.
//
//   Jahresfaelle          = Frequenz-Faktor x Anzahl Betroffene
//   Stundenpotenzial p.a.  = Jahresfaelle x Dauer je Fall / 60

export type Frequenz =
  | "TAEGLICH"
  | "MEHRMALS_WOECHENTLICH"
  | "WOECHENTLICH"
  | "MONATLICH"
  | "SELTENER";

// Faelle pro Person und Jahr
export const FREQUENZ_FAKTOR: Record<Frequenz, number> = {
  TAEGLICH: 220,
  MEHRMALS_WOECHENTLICH: 110,
  WOECHENTLICH: 44,
  MONATLICH: 12,
  SELTENER: 4,
};

export const FREQUENZ_LABEL: Record<Frequenz, string> = {
  TAEGLICH: "täglich",
  MEHRMALS_WOECHENTLICH: "mehrmals wöchentlich",
  WOECHENTLICH: "wöchentlich",
  MONATLICH: "monatlich",
  SELTENER: "seltener",
};

export interface PotenzialEingabe {
  frequenz: Frequenz;
  anzahlBetroffene: number;
  dauerMinuten: number;
}

export interface PotenzialErgebnis {
  jahresfaelle: number;
  /** gerundete Stunden pro Jahr */
  stundenpotenzialPa: number;
}

/**
 * Rechnet das Jahrespotenzial aus. Gibt null zurueck, wenn eine Eingabe fehlt
 * oder unplausibel ist (<= 0) — dann soll die Oberflaeche noch nichts anzeigen.
 */
export function berechnePotenzial(
  eingabe: Partial<PotenzialEingabe>,
): PotenzialErgebnis | null {
  const { frequenz, anzahlBetroffene, dauerMinuten } = eingabe;
  if (!frequenz || !(frequenz in FREQUENZ_FAKTOR)) return null;
  if (typeof anzahlBetroffene !== "number" || !Number.isFinite(anzahlBetroffene) || anzahlBetroffene <= 0) {
    return null;
  }
  if (typeof dauerMinuten !== "number" || !Number.isFinite(dauerMinuten) || dauerMinuten <= 0) {
    return null;
  }

  const jahresfaelle = FREQUENZ_FAKTOR[frequenz] * anzahlBetroffene;
  const stundenpotenzialPa = Math.round((jahresfaelle * dauerMinuten) / 60);
  return { jahresfaelle, stundenpotenzialPa };
}

/** "rund 312 Stunden im Jahr" */
export function formatiereStundenpotenzial(stunden: number): string {
  const gerundet =
    stunden >= 100 ? Math.round(stunden / 10) * 10 : Math.round(stunden);
  return `rund ${gerundet.toLocaleString("de-DE")} Stunden im Jahr`;
}
