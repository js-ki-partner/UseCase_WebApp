import { describe, expect, it } from "vitest";
import { berechneWertkorridor, koBestanden } from "./bewertung";

describe("berechneWertkorridor", () => {
  it("bildet den Automatisierungsgrad-Korridor 40/55/70 % ab", () => {
    // 367 h × 80 €/h = 29.360 € Basis
    const k = berechneWertkorridor(367, 80);
    // gerundet auf 500er ab 10k, sonst 100er
    expect(k.pessimistisch).toBe(Math.round((29360 * 0.4) / 500) * 500); // 11500
    expect(k.realistisch).toBe(Math.round((29360 * 0.55) / 500) * 500); // 16000
    expect(k.optimistisch).toBe(Math.round((29360 * 0.7) / 500) * 500); // 20500
    expect(k.pessimistisch).toBeLessThan(k.realistisch);
    expect(k.realistisch).toBeLessThan(k.optimistisch);
  });

  it("liefert 0 bei fehlendem Potenzial", () => {
    expect(berechneWertkorridor(0, 80)).toEqual({
      pessimistisch: 0,
      realistisch: 0,
      optimistisch: 0,
    });
  });
});

describe("koBestanden", () => {
  it("ist nur true, wenn alle vier Fragen mit ja beantwortet sind", () => {
    expect(
      koBestanden({ daten: true, prozessStabil: true, owner: true, datenschutz: true }),
    ).toBe(true);
    expect(
      koBestanden({ daten: true, prozessStabil: true, owner: true, datenschutz: false }),
    ).toBe(false);
    expect(koBestanden({ daten: true })).toBe(false);
    expect(koBestanden(null)).toBe(false);
  });
});
