"use client";

import { useState, useTransition } from "react";
import {
  fortschrittAktualisieren,
  uebertrageNachOpenProject,
} from "../../uc-actions";

export function OpenProjectAktionen({
  useCaseId,
  bereitsUebertragen,
}: {
  useCaseId: string;
  bereitsUebertragen: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null);

  const lauf = (fn: () => Promise<{ ok?: boolean; fehler?: string; hinweis?: string }>) =>
    startTransition(async () => {
      const r = await fn();
      setMeldung(
        r.fehler
          ? { ok: false, text: r.fehler }
          : { ok: true, text: r.hinweis ?? "Erledigt." },
      );
    });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          disabled={pending}
          onClick={() => lauf(() => uebertrageNachOpenProject(useCaseId))}
          className="accent-bg rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending
            ? "…"
            : bereitsUebertragen
              ? "Erneut übertragen"
              : "Nach OpenProject übertragen"}
        </button>
        {bereitsUebertragen && (
          <button
            disabled={pending}
            onClick={() => lauf(() => fortschrittAktualisieren(useCaseId))}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm disabled:opacity-60"
          >
            Status aktualisieren
          </button>
        )}
      </div>
      {meldung && (
        <p className={`text-sm ${meldung.ok ? "text-green-700" : "text-red-700"}`}>
          {meldung.text}
        </p>
      )}
    </div>
  );
}
