import { describe, expect, it } from "vitest";
import { filtereNutzlast, UEBERMITTELTE_FELDER } from "./ki";

describe("filtereNutzlast", () => {
  const uc = {
    problemText: "Angebote von Hand erstellen",
    wunschergebnis: "fertiger Entwurf",
    rolle: "Vertrieb",
    frequenz: "TAEGLICH",
    dauerMinuten: 25,
    anzahlBetroffene: 4,
    // Identitätsfelder, die NICHT übermittelt werden dürfen:
    einreicherName: "Erika Musterfrau",
    einreicherEmail: "erika@example.com",
  };

  it("übernimmt nur die freigegebenen Felder", () => {
    const p = filtereNutzlast(
      uc as unknown as Parameters<typeof filtereNutzlast>[0],
      [{ position: 1, bezeichnung: "Schritt", input: null, output: null, system: "SAP" }],
    );
    expect(Object.keys(p).sort()).toEqual(
      [
        "problemText",
        "wunschergebnis",
        "rolle",
        "frequenz",
        "dauerMinuten",
        "anzahlBetroffene",
        "prozessschritte",
      ].sort(),
    );
  });

  it("enthält keine Identitätsfelder", () => {
    const serialisiert = JSON.stringify(
      filtereNutzlast(uc as unknown as Parameters<typeof filtereNutzlast>[0], []),
    );
    expect(serialisiert).not.toContain("Musterfrau");
    expect(serialisiert).not.toContain("erika@example.com");
  });

  it("die Feldliste im Log deckt sich mit der Nutzlast", () => {
    const p = filtereNutzlast(uc as unknown as Parameters<typeof filtereNutzlast>[0], []);
    expect([...UEBERMITTELTE_FELDER].sort()).toEqual(Object.keys(p).sort());
  });
});
