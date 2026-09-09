import { describe, expect, it } from "vitest";
import {
  ableiteTitel,
  aggregiereSysteme,
  baueWorkPackageFelder,
  einwilligungsStatus,
  rendereBeschreibung,
  type Mapping,
} from "./openproject";

const MAP: Mapping = {
  type_use_case_id: 8,
  status_ids: { eingereicht: 15 },
  custom_fields: {
    uc_uuid: "customField1",
    einreicher: "customField2",
    rolle: "customField3",
    frequenz: "customField4",
    dauer_min: "customField5",
    anzahl_betroffene: "customField6",
    stundenpotenzial: "customField7",
    reifegrad: "customField8",
    wert_min: "customField9",
    wert_real: "customField10",
    wert_max: "customField11",
    konfidenz: "customField12",
    datenlage: "customField13",
    fehlerkosten: "customField14",
    betroffene_systeme: "customField15",
    ki_geprueft: "customField16",
    ki_einwilligung: "customField17",
  },
  custom_options: {
    frequenz: { täglich: 1, "mehrmals wöchentlich": 2, wöchentlich: 3, monatlich: 4, seltener: 5 },
    reifegrad: { Kurzerfassung: 6, "Prozess erfasst": 7, Bewertet: 8 },
    ki_einwilligung: { "nicht erteilt": 19, erteilt: 20, widerrufen: 21 },
  },
};

// minimaler UseCase-Stub
const baseUseCase = {
  uuid: "uc-uuid-123",
  titel: null,
  problemText: "Angebote werden von Hand erstellt.",
  wunschergebnis: null,
  rolle: "Vertrieb",
  anzahlBetroffene: 4,
  frequenz: "TAEGLICH",
  dauerMinuten: 25,
  stundenpotenzialPa: 367,
  reifegrad: "KURZ",
  status: "EINGEREICHT",
  einreicherName: null,
  einreicherEmail: null,
  istAnonym: true,
  kiEinwilligung: false,
  kiEinwilligungWiderrufenAm: null,
} as unknown as Parameters<typeof baueWorkPackageFelder>[1]["useCase"];

describe("einwilligungsStatus", () => {
  it("bildet Bool + Widerruf auf die dreiwertige Liste ab (Konzept 7)", () => {
    expect(
      einwilligungsStatus({ kiEinwilligung: false, kiEinwilligungWiderrufenAm: null }),
    ).toBe("nicht_erteilt");
    expect(
      einwilligungsStatus({ kiEinwilligung: true, kiEinwilligungWiderrufenAm: null }),
    ).toBe("erteilt");
    expect(
      einwilligungsStatus({
        kiEinwilligung: true,
        kiEinwilligungWiderrufenAm: new Date(),
      }),
    ).toBe("widerrufen");
  });
});

describe("aggregiereSysteme", () => {
  it("dedupliziert Prozessschritt-Systeme und KI-Systeme", () => {
    expect(
      aggregiereSysteme(
        [{ system: "SAP" }, { system: "Outlook" }, { system: "SAP" }, { system: null }],
        ["Outlook", "Confluence"],
      ),
    ).toBe("SAP, Outlook, Confluence");
  });

  it("ist leer, wenn nichts vorliegt", () => {
    expect(aggregiereSysteme([], [])).toBe("");
  });
});

describe("rendereBeschreibung", () => {
  it("lässt den Wunschergebnis-Abschnitt weg, wenn leer (Konzept 7)", () => {
    const md = rendereBeschreibung({ problemText: "Zu viel Handarbeit.", wunschergebnis: null });
    expect(md).toContain("## Problem");
    expect(md).not.toContain("## Wunschergebnis");
    expect(md).not.toContain("## Prozessschritte");
  });

  it("rendert Prozessschritte als Markdown-Tabelle mit Markern", () => {
    const md = rendereBeschreibung(
      { problemText: "P", wunschergebnis: "W" },
      [
        {
          position: 1,
          bezeichnung: "Anfrage sichten",
          input: "E-Mail",
          output: "geprüfte Anfrage",
          system: "Outlook",
          dauerMinuten: 5,
          hatWartezeit: false,
          brauchtEntscheidung: true,
        },
      ],
    );
    expect(md).toContain("## Wunschergebnis");
    expect(md).toContain("| # | Schritt | Eingang | Ergebnis | System | Min. | Marker |");
    expect(md).toContain("Entscheidung");
  });
});

describe("ableiteTitel", () => {
  it("kürzt lange Problemtexte", () => {
    const lang = "A".repeat(120);
    expect(ableiteTitel(lang)).toHaveLength(78);
    expect(ableiteTitel(lang).endsWith("…")).toBe(true);
  });
});

describe("baueWorkPackageFelder", () => {
  it("mappt Skalarfelder in den Body und Listenfelder in _links", () => {
    const { felder, links } = baueWorkPackageFelder(MAP, {
      useCase: baseUseCase,
      steps: [],
    });
    expect(felder.customField1).toBe("uc-uuid-123");
    expect(felder.customField2).toBe("anonym");
    expect(felder.customField3).toBe("Vertrieb");
    expect(felder.customField5).toBe(25);
    expect(felder.customField6).toBe(4);
    expect(felder.customField7).toBe(367);
    expect(felder.customField16).toBe(false);
    // betroffene_systeme: formatierbares Textfeld -> { raw }
    expect(felder.customField15).toEqual({ raw: "" });
    expect(felder.subject).toContain("Angebote werden von Hand erstellt");

    expect(links.type).toEqual({ href: "/api/v3/types/8" });
    // frequenz TAEGLICH -> "täglich" -> Option 1
    expect(links.customField4).toEqual({ href: "/api/v3/custom_options/1" });
    // reifegrad KURZ -> "Kurzerfassung" -> Option 6
    expect(links.customField8).toEqual({ href: "/api/v3/custom_options/6" });
    // ki_einwilligung nicht erteilt -> Option 19
    expect(links.customField17).toEqual({ href: "/api/v3/custom_options/19" });
  });

  it("übernimmt Bewertungsfelder nur, wenn ein Assessment vorliegt", () => {
    const ohne = baueWorkPackageFelder(MAP, { useCase: baseUseCase });
    expect(ohne.felder.customField9).toBeUndefined();

    const mit = baueWorkPackageFelder(MAP, {
      useCase: baseUseCase,
      assessment: {
        wertMin: 1000,
        wertReal: 2000,
        wertMax: 3000,
        konfidenz: null,
        datenlage: null,
        fehlerkosten: null,
      } as unknown as Parameters<typeof baueWorkPackageFelder>[1]["assessment"],
    });
    expect(mit.felder.customField9).toBe(1000);
    expect(mit.felder.customField11).toBe(3000);
  });
});
