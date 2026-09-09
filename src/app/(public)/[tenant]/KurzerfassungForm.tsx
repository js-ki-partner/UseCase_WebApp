"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  berechnePotenzial,
  formatiereStundenpotenzial,
  type Frequenz,
} from "@/lib/potential";
import { KiEinwilligungSchalter } from "./KiEinwilligungSchalter";
import type { FormState } from "./actions";

const FREQUENZ_OPTIONEN: { wert: Frequenz; label: string }[] = [
  { wert: "TAEGLICH", label: "täglich" },
  { wert: "MEHRMALS_WOECHENTLICH", label: "mehrmals wöchentlich" },
  { wert: "WOECHENTLICH", label: "wöchentlich" },
  { wert: "MONATLICH", label: "monatlich" },
  { wert: "SELTENER", label: "seltener" },
];

const DAUER_SCHNELLWAHL = [5, 15, 30, 60, 120];

export interface Defaults {
  problemText?: string;
  rolle?: string;
  anzahlBetroffene?: number | string;
  frequenz?: string;
  dauerMinuten?: number | string;
  wunschergebnis?: string;
  einreicherName?: string;
  einreicherEmail?: string;
  istAnonym?: boolean;
}

function Fehler({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="mt-1 text-sm text-red-700">{text}</p>;
}

function AbsendenButton({
  kiAktiv,
  kiVerfuegbar,
}: {
  kiAktiv: boolean;
  kiVerfuegbar: boolean;
}) {
  const { pending } = useFormStatus();
  const label = pending
    ? "Wird gesendet …"
    : !kiVerfuegbar
      ? "Absenden"
      : kiAktiv
        ? "Absenden (mit KI-Aufbereitung)"
        : "Absenden (ohne KI)";
  return (
    <button
      type="submit"
      disabled={pending}
      className="accent-bg rounded-md px-5 py-2.5 font-medium text-white disabled:opacity-60"
    >
      {label}
    </button>
  );
}

export function KurzerfassungForm({
  action,
  defaults = {},
  modus = "neu",
  kiVerfuegbar = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: Defaults;
  modus?: "neu" | "ergaenzen";
  kiVerfuegbar?: boolean;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  const ff = state.feldFehler ?? {};

  const [frequenz, setFrequenz] = useState(defaults.frequenz ?? "");
  const [anzahl, setAnzahl] = useState(String(defaults.anzahlBetroffene ?? ""));
  const [dauer, setDauer] = useState(String(defaults.dauerMinuten ?? ""));
  const [anonym, setAnonym] = useState(Boolean(defaults.istAnonym));
  const [kiAktiv, setKiAktiv] = useState(false);
  const [kiDialogOffen, setKiDialogOffen] = useState(false);

  const potenzial = useMemo(() => {
    const a = Number(anzahl);
    const dm = Number(dauer);
    if (!frequenz || !a || !dm) return null;
    return berechnePotenzial({
      frequenz: frequenz as Frequenz,
      anzahlBetroffene: a,
      dauerMinuten: dm,
    });
  }, [frequenz, anzahl, dauer]);

  return (
    <form action={formAction} className="space-y-6">
      {state.fehler && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.fehler}
        </div>
      )}

      {/* 1 — Problem */}
      <div>
        <label htmlFor="problemText" className="block font-medium">
          Was dauert zu lange oder ärgert?
        </label>
        <p className="text-sm text-gray-600">
          Beschreiben Sie das Problem, nicht schon die Lösung.
        </p>
        <textarea
          id="problemText"
          name="problemText"
          rows={4}
          required
          defaultValue={defaults.problemText}
          className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
        />
        <Fehler text={ff.problemText} />
      </div>

      {/* 2 — Betroffen */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rolle" className="block font-medium">
            Wer ist betroffen?
          </label>
          <input
            id="rolle"
            name="rolle"
            required
            placeholder="Rolle oder Abteilung"
            defaultValue={defaults.rolle}
            className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
          />
          <Fehler text={ff.rolle} />
        </div>
        <div>
          <label htmlFor="anzahlBetroffene" className="block font-medium">
            Wie viele Personen?
          </label>
          <input
            id="anzahlBetroffene"
            name="anzahlBetroffene"
            type="number"
            min={1}
            required
            value={anzahl}
            onChange={(e) => setAnzahl(e.target.value)}
            className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
          />
          <Fehler text={ff.anzahlBetroffene} />
        </div>
      </div>

      {/* 3 — Frequenz */}
      <div>
        <label htmlFor="frequenz" className="block font-medium">
          Wie oft kommt das vor?
        </label>
        <select
          id="frequenz"
          name="frequenz"
          required
          value={frequenz}
          onChange={(e) => setFrequenz(e.target.value)}
          className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
        >
          <option value="" disabled>
            Bitte wählen …
          </option>
          {FREQUENZ_OPTIONEN.map((o) => (
            <option key={o.wert} value={o.wert}>
              {o.label}
            </option>
          ))}
        </select>
        <Fehler text={ff.frequenz} />
      </div>

      {/* 4 — Dauer */}
      <div>
        <label htmlFor="dauerMinuten" className="block font-medium">
          Wie lange dauert ein Fall? (Minuten)
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {DAUER_SCHNELLWAHL.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setDauer(String(m))}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                dauer === String(m)
                  ? "accent-bg text-white"
                  : "border-gray-300 bg-white"
              }`}
            >
              {m}
            </button>
          ))}
          <input
            id="dauerMinuten"
            name="dauerMinuten"
            type="number"
            min={1}
            required
            value={dauer}
            onChange={(e) => setDauer(e.target.value)}
            className="w-24 rounded-md border border-gray-300 bg-white px-3 py-2"
          />
        </div>
        <Fehler text={ff.dauerMinuten} />
      </div>

      {/* Live-Hochrechnung (Konzept Abschnitt 4.2) */}
      {potenzial && (
        <div className="accent-border rounded-md border-l-4 bg-white px-4 py-3">
          <p className="text-sm text-gray-600">Hochgerechnetes Jahrespotenzial</p>
          <p className="text-lg font-semibold">
            Das sind {formatiereStundenpotenzial(potenzial.stundenpotenzialPa)}.
          </p>
          <p className="text-xs text-gray-500">
            {potenzial.jahresfaelle.toLocaleString("de-DE")} Fälle im Jahr ×{" "}
            {dauer} Minuten. Grobe Größenordnung, keine belastbare Rechnung.
          </p>
        </div>
      )}

      {/* 5 — Wunschergebnis */}
      <div>
        <label htmlFor="wunschergebnis" className="block font-medium">
          Was wäre das Wunschergebnis?{" "}
          <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <textarea
          id="wunschergebnis"
          name="wunschergebnis"
          rows={2}
          defaultValue={defaults.wunschergebnis}
          className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
        />
        <Fehler text={ff.wunschergebnis} />
      </div>

      {/* Einreicher */}
      <fieldset className="rounded-md border border-gray-200 bg-white px-4 py-3">
        <legend className="px-1 text-sm font-medium text-gray-700">
          Ihre Angaben (freiwillig)
        </legend>
        <label className="mt-1 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="istAnonym"
            checked={anonym}
            onChange={(e) => setAnonym(e.target.checked)}
          />
          Anonym einreichen — keine Zuordnung, keine Rückfragen möglich
        </label>
        {!anonym && (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="einreicherName" className="block text-sm">
                Name
              </label>
              <input
                id="einreicherName"
                name="einreicherName"
                defaultValue={defaults.einreicherName}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="einreicherEmail" className="block text-sm">
                E-Mail{" "}
                <span className="text-gray-500">
                  (für den Link zum späteren Ergänzen)
                </span>
              </label>
              <input
                id="einreicherEmail"
                name="einreicherEmail"
                type="email"
                defaultValue={defaults.einreicherEmail}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <Fehler text={ff.einreicherEmail} />
            </div>
          </div>
        )}
      </fieldset>

      {/* KI-Einwilligung, zweistufig (Konzept Abschnitt 4.6).
          Nur sichtbar, wenn die KI-Aufbereitung für diesen Kunden freigegeben ist. */}
      {kiVerfuegbar && (
        <KiEinwilligungSchalter
          aktiv={kiAktiv}
          onChange={setKiAktiv}
          dialogOffen={kiDialogOffen}
          setDialogOffen={setKiDialogOffen}
          verfuegbar={kiVerfuegbar}
        />
      )}

      <div className="flex items-center gap-4">
        <AbsendenButton kiAktiv={kiAktiv} kiVerfuegbar={kiVerfuegbar} />
        {modus === "neu" && (
          <span className="text-sm text-gray-500">
            Details (Prozessschritte) können Sie später ergänzen.
          </span>
        )}
      </div>
    </form>
  );
}
