import { FREQUENZ_LABEL, type Frequenz } from "./potential";

export function frequenzLabel(f: Frequenz | string): string {
  return FREQUENZ_LABEL[f as Frequenz] ?? f;
}

export function formatDatum(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDatumZeit(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatStunden(h: number): string {
  return `${h.toLocaleString("de-DE")} h/Jahr`;
}

const STATUS_LABEL: Record<string, string> = {
  ENTWURF: "Entwurf",
  EINGEREICHT: "Eingereicht",
  IN_PRUEFUNG: "In Prüfung",
  UEBERTRAGEN: "Übertragen",
  WARTELISTE: "Warteliste",
  ABGELEHNT: "Abgelehnt",
  DUPLIKAT: "Duplikat",
};

export function statusLabel(s: string): string {
  return STATUS_LABEL[s] ?? s;
}

const REIFEGRAD_LABEL: Record<string, string> = {
  KURZ: "Kurzerfassung",
  PROZESS: "Prozessschritte",
  BEWERTET: "Bewertet",
};

export function reifegradLabel(r: string): string {
  return REIFEGRAD_LABEL[r] ?? r;
}
