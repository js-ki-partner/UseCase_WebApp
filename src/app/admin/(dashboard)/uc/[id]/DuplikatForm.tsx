"use client";

import { useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  hebeDuplikatAuf,
  markiereDuplikat,
  type UcActionState,
} from "../../uc-actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-60"
    >
      {pending ? "…" : "Als Duplikat markieren"}
    </button>
  );
}

export function DuplikatForm({
  useCaseId,
  istDuplikat,
  kandidaten,
}: {
  useCaseId: string;
  istDuplikat: boolean;
  kandidaten: { id: string; label: string }[];
}) {
  const action = markiereDuplikat.bind(null, useCaseId) as (
    prev: UcActionState,
    fd: FormData,
  ) => Promise<UcActionState>;
  const [state, formAction] = useActionState<UcActionState, FormData>(action, {});
  const [pending, startTransition] = useTransition();

  if (istDuplikat) {
    return (
      <button
        disabled={pending}
        onClick={() => startTransition(() => hebeDuplikatAuf(useCaseId))}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm disabled:opacity-60"
      >
        {pending ? "…" : "Duplikat-Markierung aufheben"}
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <p className="text-sm text-gray-600">
        Diesen Eintrag einem führenden Eintrag desselben Kunden unterordnen.
      </p>
      <select
        name="fuehrendId"
        required
        defaultValue=""
        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
      >
        <option value="" disabled>
          Führenden Eintrag wählen …
        </option>
        {kandidaten.map((k) => (
          <option key={k.id} value={k.id}>
            {k.label}
          </option>
        ))}
      </select>
      <Submit />
      {state.hinweis && (
        <p className="text-sm text-green-700">{state.hinweis}</p>
      )}
      {state.fehler && <p className="text-sm text-red-700">{state.fehler}</p>}
    </form>
  );
}
