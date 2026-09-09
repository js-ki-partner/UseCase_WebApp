import type { ProcessStep, UseCase } from "@prisma/client";

// KI-Anreicherung — optional und einwilligungspflichtig (Konzept Abschnitt 4.6).
// Standardmäßig deaktiviert. Ohne gesetzten Anbieter passiert kein externer Aufruf.

/**
 * Versionskennung des im Dialog gezeigten Hinweistextes.
 * Ändert sich der Text ODER der Anbieter, wird hochgezählt — alte Einwilligungen
 * gelten dann nicht automatisch für neue Verarbeitungen (Konzept 4.6).
 */
export const KI_HINWEIS_VERSION = "2026-09-09.v1";

/** Anbieter, die im Bestätigungsdialog namentlich genannt werden. */
export function kiAnbieterNamen(): string {
  return process.env.KI_ANBIETER_NAMEN?.trim() || "OpenAI oder Google AI";
}

/** Ist ein KI-Anbieter überhaupt konfiguriert? */
export function kiKonfiguriert(): boolean {
  const p = process.env.KI_PROVIDER;
  if (!p) return false;
  if (p === "mock") return true;
  return Boolean(process.env.KI_API_KEY);
}

// Feste Kategorien (Konzept 4.6).
export const KI_KATEGORIEN = [
  "Dokumentenverarbeitung",
  "Recherche/Wissenszugriff",
  "Kommunikation",
  "Datenpflege",
  "Analyse/Reporting",
  "Qualitätsprüfung",
  "Sonstiges",
] as const;
export type KiKategorie = (typeof KI_KATEGORIEN)[number];

// Feldnamen, die an den externen Dienst übermittelt werden (für Dialog + Log + Filter).
export const UEBERMITTELTE_FELDER = [
  "problemText",
  "wunschergebnis",
  "rolle",
  "frequenz",
  "dauerMinuten",
  "anzahlBetroffene",
  "prozessschritte",
] as const;

// Bewusst NIE übermittelt (Identitätsfelder).
export const NICHT_UEBERMITTELTE_FELDER = [
  "einreicherName",
  "einreicherEmail",
  "tenant.name",
] as const;

export interface KiNutzlast {
  problemText: string;
  wunschergebnis: string | null;
  rolle: string;
  frequenz: string;
  dauerMinuten: number;
  anzahlBetroffene: number;
  prozessschritte: {
    position: number;
    bezeichnung: string;
    input: string | null;
    output: string | null;
    system: string | null;
  }[];
}

/**
 * Filterschicht (Konzept 4.6): baut die Nutzlast OHNE Identitätsfelder.
 * Wird serverseitig unmittelbar vor dem Versand aufgerufen.
 */
export function filtereNutzlast(
  uc: Pick<
    UseCase,
    | "problemText"
    | "wunschergebnis"
    | "rolle"
    | "frequenz"
    | "dauerMinuten"
    | "anzahlBetroffene"
  >,
  steps: Pick<ProcessStep, "position" | "bezeichnung" | "input" | "output" | "system">[],
): KiNutzlast {
  return {
    problemText: uc.problemText,
    wunschergebnis: uc.wunschergebnis,
    rolle: uc.rolle,
    frequenz: uc.frequenz,
    dauerMinuten: uc.dauerMinuten,
    anzahlBetroffene: uc.anzahlBetroffene,
    prozessschritte: steps
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        position: s.position,
        bezeichnung: s.bezeichnung,
        input: s.input,
        output: s.output,
        system: s.system,
      })),
  };
}

/** Dialogtext (Stufe B) — Wortlaut aus Konzept 4.6, Anbieter dynamisch. */
export function kiDialogText(): {
  titel: string;
  absaetze: string[];
  bestaetigen: string;
  abbrechen: string;
} {
  return {
    titel: "KI-Aufbereitung aktivieren?",
    absaetze: [
      `Wenn Sie diese Option einschalten, werden die Inhalte dieses Use Case beim Absenden an einen externen KI-Dienst übermittelt und dort verarbeitet. Eingesetzt werden Dienste von Anbietern wie ${kiAnbieterNamen()}.`,
      "Übermittelt werden: Ihre Problembeschreibung, das Wunschergebnis, die Angaben zu Rolle, Frequenz und Dauer sowie — falls erfasst — Ihre Prozessschritte einschließlich der genannten Systeme.",
      "Nicht übermittelt werden: Ihr Name, Ihre E-Mail-Adresse und der Name Ihres Unternehmens.",
      "Wozu: Titelvorschlag, thematische Einordnung und Hinweis auf ähnliche Einreichungen im Haus.",
      "Bitte geben Sie keine personenbezogenen Daten Dritter, Kundennamen oder Geschäftsgeheimnisse in die Freitextfelder ein.",
      "Ohne diese Option wird Ihr Use Case ganz normal erfasst und ausgewertet — lediglich die automatische Aufbereitung entfällt.",
    ],
    bestaetigen: "Verstanden, KI-Aufbereitung aktivieren",
    abbrechen: "Abbrechen",
  };
}
