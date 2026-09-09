import { describe, expect, it } from "vitest";
import { verteilungGueltig } from "./prio";

describe("verteilungGueltig", () => {
  const ids = ["a", "b", "c"];

  it("akzeptiert eine Verteilung innerhalb des Budgets", () => {
    const r = verteilungGueltig({ a: 400, b: 600 }, ids, 1000);
    expect(r).toEqual({ ok: true, summe: 1000 });
  });

  it("erlaubt, nicht das ganze Budget auszugeben", () => {
    expect(verteilungGueltig({ a: 300 }, ids, 1000).ok).toBe(true);
  });

  it("lehnt Überschreitung ab", () => {
    const r = verteilungGueltig({ a: 700, b: 700 }, ids, 1000);
    expect(r.ok).toBe(false);
    expect(r.summe).toBe(1400);
  });

  it("lehnt unbekannte Karten und negative Beträge ab", () => {
    expect(verteilungGueltig({ x: 100 }, ids, 1000).ok).toBe(false);
    expect(verteilungGueltig({ a: -50 }, ids, 1000).ok).toBe(false);
  });
});
