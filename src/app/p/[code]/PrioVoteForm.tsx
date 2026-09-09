"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { stimmeAbgeben, type StimmeState } from "./actions";

export interface Karte {
  id: string;
  titel: string;
  problem: string;
  rolle: string;
  frequenz: string;
  stunden: number;
}

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="accent-bg rounded-md px-5 py-2.5 font-medium text-white disabled:opacity-50"
    >
      {pending ? "Wird gesendet …" : "Meine Verteilung abgeben"}
    </button>
  );
}

export function PrioVoteForm({
  code,
  budget,
  karten,
}: {
  code: string;
  budget: number;
  karten: Karte[];
}) {
  const action = stimmeAbgeben.bind(null, code) as (
    p: StimmeState,
    fd: FormData,
  ) => Promise<StimmeState>;
  const [state, formAction] = useActionState<StimmeState, FormData>(action, {
    ok: false,
  });

  const [betraege, setBetraege] = useState<Record<string, number>>({});
  const summe = useMemo(
    () => Object.values(betraege).reduce((a, b) => a + (b || 0), 0),
    [betraege],
  );
  const rest = budget - summe;
  const schritt = Math.max(50, Math.round(budget / 20 / 50) * 50);

  const setBetrag = (id: string, wert: number) =>
    setBetraege((b) => ({ ...b, [id]: Math.max(0, wert) }));

  return (
    <form action={formAction} className="space-y-5">
      {state.fehler && (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.fehler}
        </p>
      )}

      <div
        className={`sticky top-2 z-10 rounded-md border px-4 py-2 text-sm ${
          rest < 0
            ? "border-red-300 bg-red-50 text-red-800"
            : "border-gray-200 bg-white"
        }`}
      >
        Budget: <strong>{budget.toLocaleString("de-DE")} €</strong> · verteilt:{" "}
        {summe.toLocaleString("de-DE")} € · übrig:{" "}
        <strong>{rest.toLocaleString("de-DE")} €</strong>
      </div>

      <div className="space-y-3">
        {karten.map((k) => (
          <div key={k.id} className="rounded-md border border-gray-200 bg-white p-4">
            <p className="font-medium">{k.titel}</p>
            <p className="mt-0.5 text-sm text-gray-600">
              {k.problem}
              {k.problem.length >= 160 ? "…" : ""}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {k.rolle} · {k.frequenz} · {k.stunden.toLocaleString("de-DE")} h/Jahr
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBetrag(k.id, (betraege[k.id] || 0) - schritt)}
                className="rounded border border-gray-300 px-2 py-1 text-sm"
              >
                −
              </button>
              <input
                name={`b_${k.id}`}
                type="number"
                min={0}
                step={schritt}
                value={betraege[k.id] || 0}
                onChange={(e) => setBetrag(k.id, Number(e.target.value))}
                className="w-28 rounded-md border border-gray-300 px-3 py-1.5 text-center"
              />
              <span className="text-sm text-gray-500">€</span>
              <button
                type="button"
                onClick={() => setBetrag(k.id, (betraege[k.id] || 0) + schritt)}
                className="rounded border border-gray-300 px-2 py-1 text-sm"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <label className="block text-sm">
        Ihr Name <span className="text-gray-500">(optional)</span>
        <input
          name="teilnehmerName"
          className="mt-1 w-full max-w-xs rounded-md border border-gray-300 px-3 py-2"
        />
      </label>

      <Submit disabled={rest < 0 || summe === 0} />
    </form>
  );
}
