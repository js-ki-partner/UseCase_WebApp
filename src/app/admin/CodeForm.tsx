"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { AuthState } from "./actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="accent-bg w-full rounded-md px-4 py-2.5 font-medium text-white disabled:opacity-60"
    >
      {pending ? "…" : label}
    </button>
  );
}

export function CodeForm({
  action,
  label,
}: {
  action: (prev: AuthState, fd: FormData) => Promise<AuthState>;
  label: string;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(action, {});
  return (
    <form action={formAction} className="space-y-4">
      {state.fehler && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.fehler}
        </p>
      )}
      <input
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]*"
        maxLength={10}
        required
        autoFocus
        placeholder="123456"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-widest"
      />
      <Submit label={label} />
    </form>
  );
}
