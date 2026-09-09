import { prisma } from "./prisma";
import { frequenzLabel, reifegradLabel, statusLabel } from "./format";
import { kundenFortschritt } from "./openproject";

// Portfolio-Export (Konzept Abschnitt 10, Stufe 2). CSV für Excel:
// UTF-8 mit BOM, Semikolon als Trenner (deutsche Excel-Konvention).

export interface PortfolioFilter {
  status?: string;
  tenantSlug?: string;
}

const SPALTEN = [
  "Kunde",
  "Titel",
  "Problem",
  "Wunschergebnis",
  "Rolle",
  "Betroffene",
  "Frequenz",
  "Dauer (Min.)",
  "Stunden/Jahr",
  "Reifegrad",
  "Status",
  "Wert min (EUR)",
  "Wert real (EUR)",
  "Wert max (EUR)",
  "Konfidenz",
  "Datenlage",
  "Fehlerkosten",
  "Owner beim Kunden",
  "Prozessschritte",
  "davon mit Wartezeit",
  "davon mit Entscheidung",
  "OpenProject-WP",
  "OpenProject-Status",
  "Kunde sieht",
  "Anonym",
  "Eingegangen",
] as const;

function csvFeld(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Lädt die Portfolio-Zeilen (alle Kunden, gefiltert wie im Eingangskorb). */
export async function ladePortfolioZeilen(filter: PortfolioFilter) {
  const useCases = await prisma.useCase.findMany({
    where: {
      ...(filter.status && filter.status !== "ALLE"
        ? { status: filter.status as never }
        : {}),
      ...(filter.tenantSlug ? { tenant: { slug: filter.tenantSlug } } : {}),
    },
    include: {
      tenant: { select: { name: true } },
      assessment: true,
      processSteps: { select: { hatWartezeit: true, brauchtEntscheidung: true } },
    },
    orderBy: [{ tenant: { name: "asc" } }, { stundenpotenzialPa: "desc" }],
  });

  return useCases.map((uc) => ({
    kunde: uc.tenant.name,
    titel: uc.titel ?? "",
    problem: uc.problemText,
    wunschergebnis: uc.wunschergebnis ?? "",
    rolle: uc.rolle,
    betroffene: uc.anzahlBetroffene,
    frequenz: frequenzLabel(uc.frequenz),
    dauerMinuten: uc.dauerMinuten,
    stundenpotenzialPa: uc.stundenpotenzialPa,
    reifegrad: reifegradLabel(uc.reifegrad),
    status: statusLabel(uc.status),
    wertMin: uc.assessment?.wertMin ?? "",
    wertReal: uc.assessment?.wertReal ?? "",
    wertMax: uc.assessment?.wertMax ?? "",
    konfidenz: uc.assessment?.konfidenz ?? "",
    datenlage: uc.assessment?.datenlage ?? "",
    fehlerkosten: uc.assessment?.fehlerkosten ?? "",
    ownerBeimKunden: uc.assessment?.ownerBeimKunden ?? "",
    schritte: uc.processSteps.length,
    schritteWartezeit: uc.processSteps.filter((s) => s.hatWartezeit).length,
    schritteEntscheidung: uc.processSteps.filter((s) => s.brauchtEntscheidung).length,
    openprojectWpId: uc.openprojectWpId ?? "",
    openprojectStatusName: uc.openprojectStatusName ?? "",
    kundeSieht: uc.openprojectStatusKey ? kundenFortschritt(uc.openprojectStatusKey) : "",
    anonym: uc.istAnonym ? "ja" : "nein",
    createdAt: uc.createdAt.toISOString().slice(0, 10),
  }));
}

export async function bauePortfolioCsv(filter: PortfolioFilter): Promise<string> {
  const zeilen = await ladePortfolioZeilen(filter);
  const kopf = SPALTEN.join(";");
  const body = zeilen
    .map((z) =>
      [
        z.kunde,
        z.titel,
        z.problem,
        z.wunschergebnis,
        z.rolle,
        z.betroffene,
        z.frequenz,
        z.dauerMinuten,
        z.stundenpotenzialPa,
        z.reifegrad,
        z.status,
        z.wertMin,
        z.wertReal,
        z.wertMax,
        z.konfidenz,
        z.datenlage,
        z.fehlerkosten,
        z.ownerBeimKunden,
        z.schritte,
        z.schritteWartezeit,
        z.schritteEntscheidung,
        z.openprojectWpId,
        z.openprojectStatusName,
        z.kundeSieht,
        z.anonym,
        z.createdAt,
      ]
        .map(csvFeld)
        .join(";"),
    )
    .join("\r\n");

  // BOM, damit Excel UTF-8 erkennt
  return "﻿" + kopf + "\r\n" + body + "\r\n";
}
