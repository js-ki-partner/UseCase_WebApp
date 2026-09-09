import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "./env";
import type {
  Assessment,
  AiEnrichment,
  ProcessStep,
  Tenant,
  UseCase,
} from "@prisma/client";

// Einseitiger, idempotenter Sync in OpenProject (Konzept Abschnitt 7).
// Die Anwendung schreibt; Bearbeitungsstatus wird in OpenProject gepflegt.
// Struktur der Mapping-Datei: openproject-mapping.example.json.

export interface Mapping {
  base_url?: string;
  type_use_case_id: number;
  status_ids: Record<string, number>;
  custom_fields: {
    uc_uuid: string;
    einreicher: string;
    rolle: string;
    frequenz: string;
    dauer_min: string;
    anzahl_betroffene: string;
    stundenpotenzial: string;
    reifegrad: string;
    wert_min: string;
    wert_real: string;
    wert_max: string;
    konfidenz: string;
    datenlage: string;
    fehlerkosten: string;
    betroffene_systeme: string;
    ki_geprueft: string;
    ki_einwilligung: string;
  };
  custom_options: {
    frequenz: Record<string, number>;
    reifegrad: Record<string, number>;
    konfidenz?: Record<string, number>;
    datenlage?: Record<string, number>;
    fehlerkosten?: Record<string, number>;
    ki_einwilligung: Record<string, number>;
  };
}

let mappingCache: Mapping | null = null;

export async function ladeMapping(): Promise<Mapping> {
  if (mappingCache) return mappingCache;
  const file = path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    env.openproject().mappingFile,
  );
  const raw = await readFile(file, "utf8");
  const map = JSON.parse(raw) as Mapping;
  if (!map.type_use_case_id || !map.custom_fields?.uc_uuid) {
    throw new Error(
      "openproject-mapping.json unvollständig (type_use_case_id / custom_fields.uc_uuid fehlen).",
    );
  }
  mappingCache = map;
  return mappingCache;
}

/** nur für Tests: den Cache leeren. */
export function _resetMappingCache(): void {
  mappingCache = null;
}

// Übersetzung unserer Enums auf die Options-Labels in der Mapping-Datei.
const FREQUENZ_OPTION: Record<string, string> = {
  TAEGLICH: "täglich",
  MEHRMALS_WOECHENTLICH: "mehrmals wöchentlich",
  WOECHENTLICH: "wöchentlich",
  MONATLICH: "monatlich",
  SELTENER: "seltener",
};
const REIFEGRAD_OPTION: Record<string, string> = {
  KURZ: "Kurzerfassung",
  PROZESS: "Prozess erfasst",
  BEWERTET: "Bewertet",
};
const EINWILLIGUNG_OPTION: Record<string, string> = {
  nicht_erteilt: "nicht erteilt",
  erteilt: "erteilt",
  widerrufen: "widerrufen",
};

/** Bool + Widerruf -> dreiwertige OpenProject-Liste (Konzept Abschnitt 7). */
export function einwilligungsStatus(
  uc: Pick<UseCase, "kiEinwilligung" | "kiEinwilligungWiderrufenAm">,
): "nicht_erteilt" | "erteilt" | "widerrufen" {
  if (uc.kiEinwilligungWiderrufenAm) return "widerrufen";
  if (uc.kiEinwilligung) return "erteilt";
  return "nicht_erteilt";
}

/**
 * Deduplizierte, kommaseparierte Systemliste aus den Prozessschritten (Stufe 2)
 * plus KI-seitig erkannten Systemen (Stufe-1-Anreicherung, sofern vorhanden).
 */
export function aggregiereSysteme(
  steps: Pick<ProcessStep, "system">[],
  kiSysteme: string[] = [],
): string {
  const set = new Set<string>();
  for (const s of steps) {
    if (s.system && s.system.trim()) set.add(s.system.trim());
  }
  for (const s of kiSysteme) {
    if (s && s.trim()) set.add(s.trim());
  }
  return [...set].join(", ");
}

/** Rendert Problem / Wunschergebnis / Prozessschritte als Markdown-Beschreibung. */
export function rendereBeschreibung(
  uc: Pick<UseCase, "problemText" | "wunschergebnis">,
  steps: Pick<
    ProcessStep,
    "position" | "bezeichnung" | "input" | "output" | "system" | "dauerMinuten" | "hatWartezeit" | "brauchtEntscheidung"
  >[] = [],
): string {
  const teile: string[] = [];
  teile.push(`## Problem\n\n${uc.problemText.trim()}`);

  if (uc.wunschergebnis && uc.wunschergebnis.trim()) {
    teile.push(`## Wunschergebnis\n\n${uc.wunschergebnis.trim()}`);
  }

  if (steps.length > 0) {
    const zeilen = steps
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((s) => {
        const marker = [
          s.hatWartezeit ? "Wartezeit" : null,
          s.brauchtEntscheidung ? "Entscheidung" : null,
        ]
          .filter(Boolean)
          .join(", ");
        return `| ${s.position} | ${esc(s.bezeichnung)} | ${esc(s.input)} | ${esc(s.output)} | ${esc(s.system)} | ${s.dauerMinuten ?? ""} | ${marker || "—"} |`;
      });
    teile.push(
      `## Prozessschritte\n\n| # | Schritt | Eingang | Ergebnis | System | Min. | Marker |\n|---|---|---|---|---|---|---|\n${zeilen.join("\n")}`,
    );
  }

  return teile.join("\n\n");
}

function esc(v: string | null | undefined): string {
  return (v ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

// --- API-Client -------------------------------------------------------------

function authHeader(): string {
  const { apiKey } = env.openproject();
  if (!apiKey) throw new Error("OP_API_KEY ist nicht gesetzt.");
  return "Basic " + Buffer.from(`apikey:${apiKey}`).toString("base64");
}

// OpenProject-JSON ist dynamisch (HAL). Wir greifen bewusst lose zu.
type OpJson = Record<string, unknown> & {
  _embedded?: { elements?: OpJson[]; status?: { name?: string } };
  id?: number;
  lockVersion?: number;
  message?: string;
  name?: string;
  identifier?: string;
  active?: boolean;
};

async function opFetch(pfad: string, init?: RequestInit): Promise<OpJson> {
  const { baseUrl } = env.openproject();
  if (!baseUrl) throw new Error("OP_BASE_URL ist nicht gesetzt.");
  const res = await fetch(`${baseUrl}${pfad}`, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(8000),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader(),
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const body: OpJson = text ? (JSON.parse(text) as OpJson) : ({} as OpJson);
  if (!res.ok) {
    const err = new Error(
      `OpenProject ${res.status}: ${body.message ?? res.statusText}`,
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return body;
}

function erwarteWp(j: OpJson): SyncErgebnis {
  if (typeof j.id !== "number" || typeof j.lockVersion !== "number") {
    throw new Error("OpenProject-Antwort ohne id / lockVersion.");
  }
  return { wpId: j.id, lockVersion: j.lockVersion };
}

export interface SyncEingabe {
  tenant: Pick<Tenant, "openprojectProjectId">;
  useCase: UseCase;
  steps?: ProcessStep[];
  assessment?: Assessment | null;
  aiEnrichment?: AiEnrichment | null;
  kiSysteme?: string[];
}

export interface SyncErgebnis {
  wpId: number;
  lockVersion: number;
}

/** Baut Body-Felder + `_links` für ein Work Package aus dem Mapping. */
export function baueWorkPackageFelder(
  map: Mapping,
  eingabe: Omit<SyncEingabe, "tenant">,
): { felder: Record<string, unknown>; links: Record<string, unknown> } {
  const { useCase, steps = [], assessment, aiEnrichment, kiSysteme = [] } = eingabe;
  const cf = map.custom_fields;

  const felder: Record<string, unknown> = {
    subject: useCase.titel?.trim() || ableiteTitel(useCase.problemText),
    description: { format: "markdown", raw: rendereBeschreibung(useCase, steps) },
    [cf.uc_uuid]: useCase.uuid,
    [cf.einreicher]: useCase.istAnonym
      ? "anonym"
      : useCase.einreicherName?.trim() || "ohne Name",
    [cf.rolle]: useCase.rolle,
    [cf.dauer_min]: useCase.dauerMinuten,
    [cf.anzahl_betroffene]: useCase.anzahlBetroffene,
    [cf.stundenpotenzial]: useCase.stundenpotenzialPa,
    // betroffene_systeme ist in OpenProject ein formatierbares Textfeld -> { raw }
    [cf.betroffene_systeme]: {
      raw: aggregiereSysteme(
        steps,
        Array.isArray(aiEnrichment?.extrahierteSysteme)
          ? (aiEnrichment!.extrahierteSysteme as string[])
          : kiSysteme,
      ),
    },
    [cf.ki_geprueft]: Boolean(aiEnrichment?.geprueft),
  };

  const links: Record<string, unknown> = {
    type: { href: `/api/v3/types/${map.type_use_case_id}` },
  };

  const opt = (
    gruppe: keyof Mapping["custom_options"],
    label: string | undefined,
  ): number | undefined => {
    if (!label) return undefined;
    return map.custom_options[gruppe]?.[label];
  };
  const setzeListe = (feld: string, id: number | undefined) => {
    if (typeof id === "number") {
      links[feld] = { href: `/api/v3/custom_options/${id}` };
    }
  };

  setzeListe(cf.frequenz, opt("frequenz", FREQUENZ_OPTION[useCase.frequenz]));
  setzeListe(cf.reifegrad, opt("reifegrad", REIFEGRAD_OPTION[useCase.reifegrad]));
  setzeListe(
    cf.ki_einwilligung,
    opt("ki_einwilligung", EINWILLIGUNG_OPTION[einwilligungsStatus(useCase)]),
  );

  // Bewertung (Stufe 3) — nur wenn vorhanden
  if (assessment) {
    if (typeof assessment.wertMin === "number") felder[cf.wert_min] = assessment.wertMin;
    if (typeof assessment.wertReal === "number") felder[cf.wert_real] = assessment.wertReal;
    if (typeof assessment.wertMax === "number") felder[cf.wert_max] = assessment.wertMax;
    setzeListe(cf.konfidenz, opt("konfidenz", assessment.konfidenz ?? undefined));
    setzeListe(cf.datenlage, opt("datenlage", assessment.datenlage ?? undefined));
    setzeListe(cf.fehlerkosten, opt("fehlerkosten", assessment.fehlerkosten ?? undefined));
  }

  return { felder, links };
}

/**
 * Legt das Work Package an oder aktualisiert ein bestehendes.
 * Idempotent ueber das UUID-Custom-Field.
 */
export async function syncUseCase(eingabe: SyncEingabe): Promise<SyncErgebnis> {
  const { tenant, useCase } = eingabe;
  if (!tenant.openprojectProjectId) {
    throw new Error("Fuer diesen Kunden ist keine OpenProject-Projekt-ID hinterlegt.");
  }
  const map = await ladeMapping();
  const { felder, links } = baueWorkPackageFelder(map, eingabe);

  const bestehend = await findeWorkPackage(useCase.uuid, map.custom_fields.uc_uuid);

  if (bestehend) {
    // Status bewusst NICHT mitsenden — er wird in OpenProject gepflegt (Runbook 4.5).
    // Bei 409 (lockVersion veraltet) frisch lesen und erneut, max. 3 Versuche (Runbook 5).
    let lockVersion = bestehend.lockVersion;
    for (let versuch = 1; versuch <= 3; versuch++) {
      try {
        const aktualisiert = await opFetch(
          `/api/v3/work_packages/${bestehend.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ lockVersion, ...felder, _links: links }),
          },
        );
        return erwarteWp(aktualisiert);
      } catch (e) {
        const status = (e as { status?: number }).status;
        if (status !== 409 || versuch === 3) throw e;
        const frisch = await opFetch(`/api/v3/work_packages/${bestehend.id}`);
        if (typeof frisch.lockVersion !== "number") throw e;
        lockVersion = frisch.lockVersion;
      }
    }
    throw new Error("OpenProject-Aktualisierung nach 3 Versuchen fehlgeschlagen (409).");
  }

  // Beim Anlegen den Startstatus "eingereicht" setzen (sofern gemappt).
  const startStatusId = map.status_ids?.eingereicht;
  if (typeof startStatusId === "number") {
    links.status = { href: `/api/v3/statuses/${startStatusId}` };
  }
  const angelegt = await opFetch(
    `/api/v3/projects/${tenant.openprojectProjectId}/work_packages`,
    {
      method: "POST",
      body: JSON.stringify({ ...felder, _links: links }),
    },
  );
  return erwarteWp(angelegt);
}

async function findeWorkPackage(
  uuid: string,
  uuidFeld: string,
): Promise<{ id: number; lockVersion: number } | null> {
  const filters = encodeURIComponent(
    JSON.stringify([{ [uuidFeld]: { operator: "=", values: [uuid] } }]),
  );
  const res = await opFetch(`/api/v3/work_packages?pageSize=1&filters=${filters}`);
  const el = res._embedded?.elements?.[0];
  if (!el || typeof el.id !== "number" || typeof el.lockVersion !== "number") {
    return null;
  }
  return { id: el.id, lockVersion: el.lockVersion };
}

export function ableiteTitel(problemText: string): string {
  const kurz = problemText.trim().replace(/\s+/g, " ");
  return kurz.length <= 80 ? kurz : kurz.slice(0, 77) + "…";
}

/** Ist der OpenProject-Zugang überhaupt konfiguriert? */
export function openprojectKonfiguriert(): boolean {
  const { baseUrl, apiKey } = env.openproject();
  return Boolean(baseUrl && apiKey);
}

export interface OpProjekt {
  id: number;
  name: string;
  identifier: string;
}

export interface ProjektListe {
  ok: boolean;
  projekte: OpProjekt[];
  fehler?: string;
}

/**
 * Listet die aktiven Projekte aus OpenProject für die Auswahl beim Kunden.
 * Wirft nicht — liefert bei Problemen `ok: false` samt Meldung, damit die
 * Oberfläche auf ein Freitextfeld zurückfallen kann.
 */
export async function listeProjekte(): Promise<ProjektListe> {
  if (!openprojectKonfiguriert()) {
    return { ok: false, projekte: [], fehler: "OpenProject ist nicht konfiguriert (OP_BASE_URL / OP_API_KEY)." };
  }
  try {
    const filters = encodeURIComponent(
      JSON.stringify([{ active: { operator: "=", values: ["t"] } }]),
    );
    const res = await opFetch(
      `/api/v3/projects?pageSize=200&sortBy=${encodeURIComponent('[["name","asc"]]')}&filters=${filters}`,
    );
    const elemente = res._embedded?.elements ?? [];
    const projekte: OpProjekt[] = elemente
      .filter((e) => typeof e.id === "number" && typeof e.name === "string")
      .map((e) => ({
        id: e.id as number,
        name: e.name as string,
        identifier: (e.identifier as string) ?? String(e.id),
      }));
    return { ok: true, projekte };
  } catch (e) {
    return {
      ok: false,
      projekte: [],
      fehler: e instanceof Error ? e.message : "OpenProject nicht erreichbar.",
    };
  }
}

// status_ids-Schlüssel -> vereinfachter, kundentauglicher Fortschritt (Konzept 4.7/7).
const KUNDEN_FORTSCHRITT: Record<string, string> = {
  eingereicht: "Eingegangen",
  geprueft: "In Prüfung",
  qualifiziert: "In Prüfung",
  priorisiert: "Eingeplant",
  in_umsetzung: "In Umsetzung",
  umgesetzt: "Umgesetzt",
  verworfen: "Nicht weiterverfolgt",
};

export interface FortschrittErgebnis {
  /** interner Schlüssel aus status_ids, z. B. "geprueft" — null, wenn unbekannt */
  key: string | null;
  /** Anzeigename aus OpenProject, z. B. "Geprüft" */
  name: string | null;
}

/** Kundentaugliches Fortschrittslabel zu einem status_ids-Schlüssel. */
export function kundenFortschritt(key: string | null | undefined): string {
  if (key && KUNDEN_FORTSCHRITT[key]) return KUNDEN_FORTSCHRITT[key];
  return "In Bearbeitung";
}

/**
 * Liest den aktuellen Status eines Work Package (nur lesen, Konzept Abschnitt 7).
 * Ordnet die OpenProject-Status-ID über die Mapping-Datei einem internen
 * Schlüssel zu.
 */
export async function leseFortschritt(
  wpId: number,
): Promise<FortschrittErgebnis | null> {
  try {
    const [wp, map] = await Promise.all([
      opFetch(`/api/v3/work_packages/${wpId}`),
      ladeMapping().catch(() => null),
    ]);
    const links = (wp as { _links?: { status?: { href?: string; title?: string } } })
      ._links;
    const name =
      links?.status?.title ?? wp._embedded?.status?.name ?? null;

    let key: string | null = null;
    const href = links?.status?.href;
    const idMatch = href?.match(/\/statuses\/(\d+)/);
    if (idMatch && map?.status_ids) {
      const statusId = Number(idMatch[1]);
      key =
        Object.entries(map.status_ids).find(([, v]) => v === statusId)?.[0] ??
        null;
    }
    return { key, name };
  } catch {
    return null;
  }
}
