"use client";

import { useTransition } from "react";
import { loescheRunde, setzeRundeOffen } from "../prio-actions";

export function RundeAktionen({
  prioRundeId,
  offen,
}: {
  prioRundeId: string;
  offen: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-3">
      <button
        disabled={pending}
        onClick={() => start(() => setzeRundeOffen(prioRundeId, !offen))}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-60"
      >
        {offen ? "Runde schließen" : "Runde wieder öffnen"}
      </button>
      <button
        disabled={pending}
        onClick={() => {
          if (confirm("Runde mit allen Stimmen löschen?")) {
            start(() => loescheRunde(prioRundeId));
          }
        }}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-red-700 disabled:opacity-60"
      >
        Löschen
      </button>
    </div>
  );
}
