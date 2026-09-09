"use client";

import { useState, useTransition } from "react";
import { alleFortschritteAktualisieren } from "./uc-actions";

export function FortschrittRefreshButton() {
  const [pending, startTransition] = useTransition();
  const [meldung, setMeldung] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2 text-sm">
      {meldung && <span className="text-gray-500">{meldung}</span>}
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await alleFortschritteAktualisieren();
            setMeldung(r.hinweis ?? r.fehler ?? null);
          })
        }
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 disabled:opacity-60"
      >
        {pending ? "Lese OpenProject …" : "Fortschritt aus OpenProject aktualisieren"}
      </button>
    </div>
  );
}
