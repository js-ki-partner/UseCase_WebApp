import { describe, expect, it } from "vitest";
import {
  berechnePotenzial,
  formatiereStundenpotenzial,
  FREQUENZ_FAKTOR,
} from "./potential";

describe("berechnePotenzial", () => {
  it("rechnet das Anhang-Beispiel des Konzepts (220 x 4 x 25 / 60 = 367)", () => {
    const r = berechnePotenzial({
      frequenz: "TAEGLICH",
      anzahlBetroffene: 4,
      dauerMinuten: 25,
    });
    expect(r).not.toBeNull();
    expect(r!.jahresfaelle).toBe(880);
    expect(r!.stundenpotenzialPa).toBe(367);
  });

  it("nutzt die Frequenz-Faktoren aus Abschnitt 4.5", () => {
    expect(FREQUENZ_FAKTOR).toEqual({
      TAEGLICH: 220,
      MEHRMALS_WOECHENTLICH: 110,
      WOECHENTLICH: 44,
      MONATLICH: 12,
      SELTENER: 4,
    });
  });

  it("gibt null zurueck, solange eine Angabe fehlt", () => {
    expect(berechnePotenzial({})).toBeNull();
    expect(
      berechnePotenzial({ frequenz: "TAEGLICH", anzahlBetroffene: 3 }),
    ).toBeNull();
  });

  it("gibt null bei unplausiblen Werten zurueck", () => {
    expect(
      berechnePotenzial({ frequenz: "TAEGLICH", anzahlBetroffene: 0, dauerMinuten: 10 }),
    ).toBeNull();
    expect(
      berechnePotenzial({ frequenz: "TAEGLICH", anzahlBetroffene: 2, dauerMinuten: -5 }),
    ).toBeNull();
  });

  it("rundet das Stundenpotenzial kaufmaennisch", () => {
    // 12 * 1 * 30 / 60 = 6
    expect(
      berechnePotenzial({ frequenz: "MONATLICH", anzahlBetroffene: 1, dauerMinuten: 30 })!
        .stundenpotenzialPa,
    ).toBe(6);
  });
});

describe("formatiereStundenpotenzial", () => {
  it("rundet grosse Werte auf Zehner", () => {
    expect(formatiereStundenpotenzial(367)).toBe("rund 370 Stunden im Jahr");
  });
  it("laesst kleine Werte genau", () => {
    expect(formatiereStundenpotenzial(6)).toBe("rund 6 Stunden im Jahr");
  });
});
