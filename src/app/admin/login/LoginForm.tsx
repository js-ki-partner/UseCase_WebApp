"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type AuthState } from "../actions";

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

export function LoginForm() {
  const [state, action] = useActionState<AuthState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      {state.fehler && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.fehler}
        </p>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          E-Mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="passwort" className="block text-sm font-medium">
          Passwort
        </label>
        <input
          id="passwort"
          name="passwort"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>
      <Submit label="Anmelden" />
    </form>
  );
}
