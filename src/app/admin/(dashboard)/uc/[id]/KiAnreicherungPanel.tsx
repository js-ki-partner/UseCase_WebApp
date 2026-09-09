"use client";

import { useState, useTransition } from "react";
import {
  anreicherungAlsGeprueft,
  anreicherungErneut,
  anreicherungUebernehmen,
} from "../../uc-actions";

interface Aehnlich {
  useCaseId: string;
  titel: string;
  score: number;
}

export function KiAnreicherungPanel({
  useCaseId,
  status,
  fehler,
  titelVorschlag,
  kategorie,
  extrahierteSysteme,
  aehnliche,
  anbieter,
  modell,
  geprueft,
  einwilligung,
}: {
  useCaseId: string;
  status: string;
  fehler: string | null;
  titelVorschlag: string | null;
  kategorie: string | null;
  extrahierteSysteme: string[];
  aehnliche: Aehnlich[];
  anbieter: string | null;
  modell: string | null;
  geprueft: boolean;
  einwilligung: "erteilt" | "widerrufen" | "nicht_erteilt";
}) {
  const [pending, startTransition] = useTransition();
  const [meldung, setMeldung] = useState<string | null>(null);
  const lauf = (fn: () => Promise<{ hinweis?: string; fehler?: string }>) =>
    startTransition(async () => {
      const r = await fn();
      setMeldung(r.hinweis ?? r.fehler ?? null);
    });

  return (
    <div className="space-y-3 text-sm">
      <p className="text-gray-600">
        Einwilligung:{" "}
        <span className="font-medium">
          {einwilligung === "erteilt"
            ? "erteilt"
            : einwilligung === "widerrufen"
              ? "widerrufen"
              : "nicht erteilt"}
        </span>
        {(anbieter || modell) && (
          <span className="text-gray-500">
            {" "}
            · {anbieter}
            {modell ? ` / ${modell}` : ""}
          </span>
        )}
        {" · Status: "}
        {status}
        {geprueft && " · geprüft"}
      </p>

      {fehler && (
        <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{fehler}</p>
      )}

      {(titelVorschlag || kategorie || extrahierteSysteme.length > 0) && (
        <dl className="space-y-1">
          {titelVorschlag && (
            <div>
              <dt className="inline text-gray-500">Titelvorschlag: </dt>
              <dd className="inline font-medium">{titelVorschlag}</dd>
            </div>
          )}
          {kategorie && (
            <div>
              <dt className="inline text-gray-500">Kategorie: </dt>
              <dd className="inline">{kategorie}</dd>
            </div>
          )}
          {extrahierteSysteme.length > 0 && (
            <div>
              <dt className="inline text-gray-500">Erkannte Systeme: </dt>
              <dd className="inline">{extrahierteSysteme.join(", ")}</dd>
            </div>
          )}
        </dl>
      )}

      {aehnliche.length > 0 && (
        <div>
          <p className="text-gray-500">Ähnliche Einträge (lokal ermittelt):</p>
          <ul className="mt-1 space-y-0.5">
            {aehnliche.map((a) => (
              <li key={a.useCaseId}>
                <a
                  href={`/admin/uc/${a.useCaseId}`}
                  className="accent-text underline"
                >
                  {a.titel}
                </a>{" "}
                <span className="text-gray-400">
                  ({Math.round(a.score * 100)} %)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {titelVorschlag && (
          <button
            disabled={pending}
            onClick={() => lauf(() => anreicherungUebernehmen(useCaseId))}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-60"
          >
            Titelvorschlag übernehmen
          </button>
        )}
        {!geprueft && (
          <button
            disabled={pending}
            onClick={() => lauf(() => anreicherungAlsGeprueft(useCaseId))}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-60"
          >
            Als geprüft markieren
          </button>
        )}
        <button
          disabled={pending}
          onClick={() => lauf(() => anreicherungErneut(useCaseId))}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-60"
        >
          Neu verarbeiten
        </button>
      </div>
      {meldung && <p className="text-green-700">{meldung}</p>}
    </div>
  );
}
