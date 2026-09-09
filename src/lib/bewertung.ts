// Bewertung Stufe 3 (Konzept 4.4/4.5). Der Euro-Wert ist bewusst ein Korridor,
// nie eine Punktschätzung.

// Automatisierungsgrad-Korridor (Konzept 4.5: „etwa 40 bis 70 Prozent")
export const AUTOMATISIERUNG_MIN = 0.4;
export const AUTOMATISIERUNG_REAL = 0.55;
export const AUTOMATISIERUNG_MAX = 0.7;

export interface Wertkorridor {
  pessimistisch: number;
  realistisch: number;
  optimistisch: number;
}

function rundeEuro(v: number): number {
  if (v >= 10000) return Math.round(v / 500) * 500;
  if (v >= 1000) return Math.round(v / 100) * 100;
  return Math.round(v / 50) * 50;
}

/** Vorschlag für den Euro-Wertkorridor aus Stundenpotenzial und Stundensatz. */
export function berechneWertkorridor(
  stundenpotenzialPa: number,
  stundensatz: number,
): Wertkorridor {
  const basis = stundenpotenzialPa * stundensatz;
  return {
    pessimistisch: rundeEuro(basis * AUTOMATISIERUNG_MIN),
    realistisch: rundeEuro(basis * AUTOMATISIERUNG_REAL),
    optimistisch: rundeEuro(basis * AUTOMATISIERUNG_MAX),
  };
}

export function formatEuro(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v.toLocaleString("de-DE")} €`;
}

// Werte müssen exakt den custom_options-Schlüsseln der Mapping-Datei entsprechen.
export const KONFIDENZ_WERTE = ["niedrig", "mittel", "hoch"] as const;
export const DATENLAGE_WERTE = [
  "vorhanden strukturiert",
  "vorhanden unstrukturiert",
  "teilweise",
  "nicht vorhanden",
] as const;
export const FEHLERKOSTEN_WERTE = ["gering", "mittel", "hoch/kritisch"] as const;

// K.-o.-Fragen (Konzept 4.4)
export const KO_FRAGEN = [
  { key: "daten", frage: "Existieren die benötigten Daten heute in nutzbarer Form?" },
  { key: "prozessStabil", frage: "Ist der Prozess stabil genug?" },
  { key: "owner", frage: "Gibt es einen Owner, der Ergebnisse abnimmt?" },
  { key: "datenschutz", frage: "Sind Datenschutz und Mitbestimmung handhabbar?" },
] as const;

export type KoKey = (typeof KO_FRAGEN)[number]["key"];

export interface KoKriterien {
  daten?: boolean;
  prozessStabil?: boolean;
  owner?: boolean;
  datenschutz?: boolean;
  begruendung?: string;
}

/** true, wenn alle vier Fragen mit „ja" beantwortet sind. */
export function koBestanden(k: KoKriterien | null | undefined): boolean {
  if (!k) return false;
  return KO_FRAGEN.every((f) => k[f.key] === true);
}
