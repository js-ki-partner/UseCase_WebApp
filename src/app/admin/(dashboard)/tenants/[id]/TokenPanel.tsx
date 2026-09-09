"use client";

import { useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  rotiereToken,
  widerrufeToken,
  type TenantState,
} from "../tenant-actions";

function Submit({ hatToken }: { hatToken: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="accent-bg rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? "…" : hatToken ? "Zugangslink erneuern" : "Zugangslink erzeugen"}
    </button>
  );
}

export function TokenPanel({
  tenantId,
  slug,
  hatToken,
  gueltigBis,
  appBaseUrl,
}: {
  tenantId: string;
  slug: string;
  hatToken: boolean;
  gueltigBis: string;
  appBaseUrl: string;
}) {
  const action = rotiereToken.bind(null, tenantId) as (
    prev: TenantState,
    fd: FormData,
  ) => Promise<TenantState>;
  const [state, formAction] = useActionState<TenantState, FormData>(action, {});
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        {hatToken
          ? `Aktiver Zugangslink, gültig bis ${gueltigBis}.`
          : "Kein aktiver Zugangslink — der Einreicher-Link funktioniert derzeit nicht."}
      </p>

      {state.klartextToken && (
        <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm">
          <p className="font-medium text-green-800">{state.hinweis}</p>
          {state.tokenGueltigBis && (
            <p className="mt-1 text-xs text-green-800">
              Gültig bis {state.tokenGueltigBis}.
            </p>
          )}
          <code className="mt-2 block break-all rounded bg-white p-2 font-mono text-xs">
            {appBaseUrl}/{slug}?t={state.klartextToken}
          </code>
        </div>
      )}

      <form action={formAction} className="flex items-end gap-2">
        <label className="text-sm">
          Gültigkeit (Tage)
          <input
            name="tokenGueltigTage"
            type="number"
            min={1}
            defaultValue={365}
            className="mt-1 block w-28 rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <Submit hatToken={hatToken} />
      </form>
      {hatToken && (
        <p className="text-xs text-amber-700">
          Beim Erneuern wird der bisherige Link ungültig.
        </p>
      )}

      {hatToken && (
        <button
          disabled={pending}
          onClick={() => startTransition(() => widerrufeToken(tenantId))}
          className="text-sm text-red-700 underline disabled:opacity-60"
        >
          Zugangslink widerrufen
        </button>
      )}
    </div>
  );
}
