"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  erstelleKontakt,
  loescheKontakt,
  rotiereKontaktZugang,
  widerrufeKontaktZugang,
  type KontaktState,
} from "./kontakt-actions";

export interface KontaktZeile {
  id: string;
  name: string;
  email: string;
  hatZugang: boolean;
  gueltigBis: string;
  letzterLogin: string;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="accent-bg rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? "…" : "Ansprechpartner anlegen"}
    </button>
  );
}

export function KontaktPanel({
  tenantId,
  kontakte,
}: {
  tenantId: string;
  kontakte: KontaktZeile[];
}) {
  const action = erstelleKontakt.bind(null, tenantId) as (
    p: KontaktState,
    fd: FormData,
  ) => Promise<KontaktState>;
  const [state, formAction] = useActionState<KontaktState, FormData>(action, {});
  const [pending, start] = useTransition();
  const [rotLink, setRotLink] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {kontakte.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
          {kontakte.map((k) => (
            <li key={k.id} className="p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{k.name}</span>{" "}
                  <span className="text-gray-500">· {k.email}</span>
                  <div className="text-xs text-gray-500">
                    {k.hatZugang
                      ? `Zugang aktiv bis ${k.gueltigBis}`
                      : "kein aktiver Zugang"}
                    {k.letzterLogin !== "—" && ` · zuletzt ${k.letzterLogin}`}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await rotiereKontaktZugang(k.id);
                        setRotLink(r.klartextLink ?? null);
                      })
                    }
                    className="rounded border border-gray-300 px-2 py-1 disabled:opacity-60"
                  >
                    {k.hatZugang ? "Link erneuern" : "Link erzeugen"}
                  </button>
                  {k.hatZugang && (
                    <button
                      disabled={pending}
                      onClick={() => start(() => widerrufeKontaktZugang(k.id))}
                      className="rounded border border-gray-300 px-2 py-1 text-red-700 disabled:opacity-60"
                    >
                      widerrufen
                    </button>
                  )}
                  <button
                    disabled={pending}
                    onClick={() => {
                      if (confirm(`${k.name} löschen?`)) {
                        start(() => loescheKontakt(k.id));
                      }
                    }}
                    className="rounded border border-gray-300 px-2 py-1 text-red-700 disabled:opacity-60"
                  >
                    löschen
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(state.klartextLink || rotLink) && (
        <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm">
          <p className="font-medium text-green-800">
            {state.hinweis ?? "Neuer Zugangslink"}
          </p>
          <code className="mt-1 block break-all font-mono text-xs">
            {state.klartextLink ?? rotLink}
          </code>
        </div>
      )}
      {state.hinweis && !state.klartextLink && (
        <p className="text-sm text-green-700">{state.hinweis}</p>
      )}
      {state.fehler && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.fehler}
        </p>
      )}

      <form action={formAction} className="space-y-3 border-t border-gray-200 pt-4">
        <p className="text-sm font-medium">Neuen Ansprechpartner anlegen</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Name
            <input
              name="name"
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            E-Mail
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="mailSenden" defaultChecked />
          Zugangslink direkt per E-Mail schicken
        </label>
        <Submit />
      </form>
    </div>
  );
}
