"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { SYSTEM_VORSCHLAEGE } from "@/lib/validation";
import type { ProzessFormState } from "../actions";

export interface SchrittWert {
  bezeichnung: string;
  input: string;
  output: string;
  system: string;
  dauerMinuten: string;
  hatWartezeit: boolean;
  brauchtEntscheidung: boolean;
}

const LEER: SchrittWert = {
  bezeichnung: "",
  input: "",
  output: "",
  system: "",
  dauerMinuten: "",
  hatWartezeit: false,
  brauchtEntscheidung: false,
};

function Absenden() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="accent-bg rounded-md px-5 py-2.5 font-medium text-white disabled:opacity-60"
    >
      {pending ? "Wird gespeichert …" : "Prozessschritte speichern"}
    </button>
  );
}

export function ProzessEditor({
  action,
  initial,
}: {
  action: (prev: ProzessFormState, fd: FormData) => Promise<ProzessFormState>;
  initial: SchrittWert[];
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  const [schritte, setSchritte] = useState<SchrittWert[]>(
    initial.length > 0 ? initial : [{ ...LEER }],
  );

  const setFeld = (i: number, feld: keyof SchrittWert, wert: string | boolean) =>
    setSchritte((s) => s.map((row, idx) => (idx === i ? { ...row, [feld]: wert } : row)));

  const entfernen = (i: number) =>
    setSchritte((s) => (s.length === 1 ? s : s.filter((_, idx) => idx !== i)));

  const verschieben = (i: number, richtung: -1 | 1) =>
    setSchritte((s) => {
      const j = i + richtung;
      if (j < 0 || j >= s.length) return s;
      const kopie = [...s];
      [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
      return kopie;
    });

  return (
    <form action={formAction} className="space-y-6">
      {state.fehler && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.fehler}
        </div>
      )}

      <datalist id="system-vorschlaege">
        {SYSTEM_VORSCHLAEGE.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <ol className="space-y-5">
        {schritte.map((s, i) => (
          <li
            key={i}
            className="rounded-md border border-gray-200 bg-white p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-medium">Schritt {i + 1}</span>
              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => verschieben(i, -1)}
                  disabled={i === 0}
                  className="rounded border border-gray-300 px-2 disabled:opacity-40"
                  aria-label="nach oben"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => verschieben(i, 1)}
                  disabled={i === schritte.length - 1}
                  className="rounded border border-gray-300 px-2 disabled:opacity-40"
                  aria-label="nach unten"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => entfernen(i)}
                  disabled={schritte.length === 1}
                  className="rounded border border-gray-300 px-2 text-red-700 disabled:opacity-40"
                >
                  Entfernen
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium">Was passiert in diesem Schritt?</label>
                <input
                  name={`schritt[${i}][bezeichnung]`}
                  value={s.bezeichnung}
                  onChange={(e) => setFeld(i, "bezeichnung", e.target.value)}
                  required
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm">Eingang — was liegt vor?</label>
                  <input
                    name={`schritt[${i}][input]`}
                    value={s.input}
                    onChange={(e) => setFeld(i, "input", e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm">Ergebnis — was entsteht?</label>
                  <input
                    name={`schritt[${i}][output]`}
                    value={s.output}
                    onChange={(e) => setFeld(i, "output", e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm">Verwendetes System</label>
                  <input
                    name={`schritt[${i}][system]`}
                    value={s.system}
                    onChange={(e) => setFeld(i, "system", e.target.value)}
                    list="system-vorschlaege"
                    placeholder="wählen oder eingeben"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm">Geschätzte Dauer (Minuten)</label>
                  <input
                    name={`schritt[${i}][dauerMinuten]`}
                    value={s.dauerMinuten}
                    onChange={(e) => setFeld(i, "dauerMinuten", e.target.value)}
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name={`schritt[${i}][hatWartezeit]`}
                    checked={s.hatWartezeit}
                    onChange={(e) => setFeld(i, "hatWartezeit", e.target.checked)}
                  />
                  Hier entsteht Wartezeit
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name={`schritt[${i}][brauchtEntscheidung]`}
                    checked={s.brauchtEntscheidung}
                    onChange={(e) => setFeld(i, "brauchtEntscheidung", e.target.checked)}
                  />
                  Menschliche Entscheidung erforderlich
                </label>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => setSchritte((s) => [...s, { ...LEER }])}
        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm"
      >
        + Schritt hinzufügen
      </button>

      <div className="border-t border-gray-200 pt-4">
        <Absenden />
      </div>
    </form>
  );
}
