"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { erstelleRunde, type PrioState } from "./prio-actions";

export interface TenantMitUseCases {
  id: string;
  name: string;
  useCases: { id: string; label: string; potenzial: number }[];
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="accent-bg rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? "…" : "Runde anlegen"}
    </button>
  );
}

export function NeueRundeForm({ tenants }: { tenants: TenantMitUseCases[] }) {
  const [state, formAction] = useActionState<PrioState, FormData>(erstelleRunde, {});
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? "");
  const aktueller = tenants.find((t) => t.id === tenantId);

  return (
    <form action={formAction} className="space-y-4">
      {state.fehler && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.fehler}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Kunde
          <select
            name="tenantId"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Titel der Runde
          <input
            name="titel"
            required
            placeholder="Workshop-Priorisierung März"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Budget je Teilnehmer (EUR)
          <input
            name="budget"
            type="number"
            min={100}
            defaultValue={1000}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </label>
      </div>

      <fieldset className="rounded-md border border-gray-200 p-3">
        <legend className="px-1 text-sm font-medium">
          Use Cases zur Abstimmung
        </legend>
        <div className="mt-1 max-h-72 space-y-1 overflow-y-auto">
          {(aktueller?.useCases ?? []).map((uc) => (
            <label key={uc.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="useCaseIds" value={uc.id} defaultChecked />
              <span>{uc.label}</span>
              <span className="text-xs text-gray-400">
                {uc.potenzial.toLocaleString("de-DE")} h/Jahr
              </span>
            </label>
          ))}
          {(aktueller?.useCases.length ?? 0) === 0 && (
            <p className="text-sm text-gray-500">
              Für diesen Kunden gibt es keine passenden Use Cases.
            </p>
          )}
        </div>
      </fieldset>

      <Submit />
    </form>
  );
}
