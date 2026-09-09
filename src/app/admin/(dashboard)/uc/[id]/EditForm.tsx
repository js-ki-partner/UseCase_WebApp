"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { speichereFelder, type UcActionState } from "../../uc-actions";

const STATUS_WERTE = [
  "EINGEREICHT",
  "IN_PRUEFUNG",
  "UEBERTRAGEN",
  "WARTELISTE",
  "ABGELEHNT",
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-60"
    >
      {pending ? "Speichere …" : "Speichern"}
    </button>
  );
}

export function EditForm({
  useCaseId,
  titel,
  status,
  notizIntern,
}: {
  useCaseId: string;
  titel: string;
  status: string;
  notizIntern: string;
}) {
  const action = speichereFelder.bind(null, useCaseId) as (
    prev: UcActionState,
    fd: FormData,
  ) => Promise<UcActionState>;
  const [state, formAction] = useActionState<UcActionState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="block text-sm font-medium">Titel</label>
        <input
          name="titel"
          defaultValue={titel}
          placeholder="Tätigkeit + Gegenstand"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Status</label>
        <select
          name="status"
          defaultValue={status}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {STATUS_WERTE.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Interne Notiz</label>
        <textarea
          name="notizIntern"
          defaultValue={notizIntern}
          rows={3}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-center gap-3">
        <Submit />
        {state.hinweis && (
          <span className="text-sm text-green-700">{state.hinweis}</span>
        )}
        {state.fehler && (
          <span className="text-sm text-red-700">{state.fehler}</span>
        )}
      </div>
    </form>
  );
}
