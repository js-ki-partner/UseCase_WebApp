"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  DATENLAGE_WERTE,
  FEHLERKOSTEN_WERTE,
  KONFIDENZ_WERTE,
  KO_FRAGEN,
  formatEuro,
  type KoKriterien,
  type Wertkorridor,
} from "@/lib/bewertung";
import { speichereBewertung, type BewertungState } from "./bewertung-actions";

export interface BewertungWerte {
  wertMin: number | null;
  wertReal: number | null;
  wertMax: number | null;
  konfidenz: string | null;
  datenlage: string | null;
  fehlerkosten: string | null;
  ownerBeimKunden: string | null;
  notizIntern: string | null;
  koKriterien: KoKriterien | null;
  bewertetVon: string | null;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="accent-bg rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? "Speichere …" : "Bewertung speichern"}
    </button>
  );
}

export function BewertungForm({
  useCaseId,
  werte,
  vorschlag,
}: {
  useCaseId: string;
  werte: BewertungWerte | null;
  vorschlag: Wertkorridor;
}) {
  const action = speichereBewertung.bind(null, useCaseId) as (
    p: BewertungState,
    fd: FormData,
  ) => Promise<BewertungState>;
  const [state, formAction] = useActionState<BewertungState, FormData>(action, {});
  const ko = werte?.koKriterien ?? null;

  return (
    <form action={formAction} className="space-y-5">
      {state.fehler && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.fehler}
        </p>
      )}
      {state.hinweis && (
        <p className="text-sm text-green-700">{state.hinweis}</p>
      )}

      {/* K.-o.-Kriterien */}
      <fieldset className="rounded-md border border-gray-200 p-3">
        <legend className="px-1 text-sm font-medium">K.-o.-Kriterien</legend>
        <div className="space-y-2">
          {KO_FRAGEN.map((f) => (
            <div key={f.key} className="flex items-start justify-between gap-3 text-sm">
              <span>{f.frage}</span>
              <span className="flex shrink-0 gap-3">
                {(["ja", "nein"] as const).map((opt) => (
                  <label key={opt} className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`ko_${f.key}`}
                      value={opt}
                      defaultChecked={
                        ko?.[f.key] === (opt === "ja")
                      }
                    />
                    {opt === "ja" ? "Ja" : "Nein"}
                  </label>
                ))}
              </span>
            </div>
          ))}
        </div>
        <label className="mt-3 block text-sm">
          Begründung (nötig, wenn eine Frage »nein« ist — geht in die Warteliste)
          <textarea
            name="ko_begruendung"
            rows={2}
            defaultValue={ko?.begruendung ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
      </fieldset>

      {/* Wertkorridor */}
      <fieldset className="rounded-md border border-gray-200 p-3">
        <legend className="px-1 text-sm font-medium">Wertkorridor (EUR / Jahr)</legend>
        <p className="mb-2 text-xs text-gray-500">
          Vorschlag aus Stundenpotenzial × Automatisierungsgrad (40–70 %) ×
          Stundensatz: {formatEuro(vorschlag.pessimistisch)} /{" "}
          {formatEuro(vorschlag.realistisch)} / {formatEuro(vorschlag.optimistisch)}.
          Bitte prüfen und anpassen — nie als exakte Zahl verstehen.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <label className="text-sm">
            pessimistisch
            <input
              name="wertMin"
              type="number"
              min={0}
              defaultValue={werte?.wertMin ?? vorschlag.pessimistisch}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            realistisch
            <input
              name="wertReal"
              type="number"
              min={0}
              defaultValue={werte?.wertReal ?? vorschlag.realistisch}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            optimistisch
            <input
              name="wertMax"
              type="number"
              min={0}
              defaultValue={werte?.wertMax ?? vorschlag.optimistisch}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          Konfidenz
          <select
            name="konfidenz"
            defaultValue={werte?.konfidenz ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
          >
            <option value="">—</option>
            {KONFIDENZ_WERTE.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Datenlage
          <select
            name="datenlage"
            defaultValue={werte?.datenlage ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
          >
            <option value="">—</option>
            {DATENLAGE_WERTE.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Fehlerkosten
          <select
            name="fehlerkosten"
            defaultValue={werte?.fehlerkosten ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
          >
            <option value="">—</option>
            {FEHLERKOSTEN_WERTE.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        Fachlicher Owner beim Kunden
        <input
          name="ownerBeimKunden"
          defaultValue={werte?.ownerBeimKunden ?? ""}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </label>

      <label className="block text-sm">
        Interne Notiz (nur KI Partner)
        <textarea
          name="notizIntern"
          rows={2}
          defaultValue={werte?.notizIntern ?? ""}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </label>

      <div className="flex items-center gap-3">
        <Submit />
        {werte?.bewertetVon && (
          <span className="text-xs text-gray-500">
            zuletzt bewertet von {werte.bewertetVon}
          </span>
        )}
      </div>
    </form>
  );
}
