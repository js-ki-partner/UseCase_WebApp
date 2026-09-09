"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { speichereKontext, type KontextState } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-60"
    >
      {pending ? "…" : "Kontext speichern"}
    </button>
  );
}

export function KontextForm({
  useCaseId,
  slug,
  wert,
}: {
  useCaseId: string;
  slug: string;
  wert: string;
}) {
  const action = speichereKontext.bind(null, useCaseId, slug) as (
    p: KontextState,
    fd: FormData,
  ) => Promise<KontextState>;
  const [state, formAction] = useActionState<KontextState, FormData>(action, {
    ok: false,
  });

  return (
    <form action={formAction} className="mt-3">
      <label className="block text-xs font-medium text-gray-600">
        Kontext ergänzen (nur für KI&nbsp;Partner sichtbar)
      </label>
      <textarea
        name="kundenkontext"
        rows={2}
        defaultValue={wert}
        placeholder="z. B. betroffene Abteilung, Priorität, bekannte Randbedingungen"
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <div className="mt-1 flex items-center gap-3">
        <Submit />
        {state.hinweis && (
          <span className="text-xs text-green-700">{state.hinweis}</span>
        )}
        {state.fehler && (
          <span className="text-xs text-red-700">{state.fehler}</span>
        )}
      </div>
    </form>
  );
}
