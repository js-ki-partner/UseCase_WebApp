"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { TenantState } from "./tenant-actions";

export interface ProjektOption {
  id: number;
  name: string;
  identifier: string;
}

export interface ProjektAuswahl {
  ok: boolean;
  items: ProjektOption[];
  fehler?: string;
}

interface Werte {
  slug?: string;
  name?: string;
  openprojectProjectId?: string;
  stundensatzDefault?: number;
  brandingLogoUrl?: string;
  brandingAccentColor?: string;
  zeigtBewertung?: boolean;
  kiAktiviert?: boolean;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="accent-bg rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? "…" : label}
    </button>
  );
}

function F({ text }: { text?: string }) {
  return text ? <p className="mt-1 text-xs text-red-700">{text}</p> : null;
}

export function TenantForm({
  action,
  werte = {},
  label,
  modus = "bearbeiten",
  projekte,
  appBaseUrl,
}: {
  action: (prev: TenantState, fd: FormData) => Promise<TenantState>;
  werte?: Werte;
  label: string;
  modus?: "neu" | "bearbeiten";
  projekte?: ProjektAuswahl;
  appBaseUrl?: string;
}) {
  const [state, formAction] = useActionState<TenantState, FormData>(action, {});
  const ff = state.feldFehler ?? {};
  const [tokenErzeugen, setTokenErzeugen] = useState(modus === "neu");

  // Erfolgs-Panel nach dem Anlegen
  if (modus === "neu" && state.ok && state.tenantId) {
    const link =
      state.klartextToken && state.slug
        ? `${appBaseUrl ?? ""}/${state.slug}?t=${state.klartextToken}`
        : null;
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          {state.hinweis}
        </p>
        {link ? (
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <p className="text-sm font-medium">Kundenlink (einmalig sichtbar)</p>
            <p className="mt-1 text-xs text-gray-500">
              Gültig bis {state.tokenGueltigBis}. Jetzt kopieren — der Token wird
              nicht erneut angezeigt.
            </p>
            <code className="mt-2 block break-all rounded bg-gray-50 p-2 font-mono text-xs">
              {link}
            </code>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            Es wurde noch kein Zugangslink erzeugt. Das können Sie auf der
            Kundenseite nachholen.
          </p>
        )}
        <Link
          href={`/admin/tenants/${state.tenantId}`}
          className="accent-text text-sm underline"
        >
          Zur Kundenseite →
        </Link>
      </div>
    );
  }

  const hatProjektListe = projekte?.ok && projekte.items.length > 0;

  return (
    <form action={formAction} className="space-y-4">
      {state.fehler && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.fehler}
        </p>
      )}
      {state.hinweis && !state.klartextToken && modus === "bearbeiten" && (
        <p className="text-sm text-green-700">{state.hinweis}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Slug (URL-Teil)
          <input
            name="slug"
            required
            defaultValue={werte.slug}
            placeholder="muster-maschinenbau"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <F text={ff.slug} />
        </label>
        <label className="block text-sm">
          Anzeigename
          <input
            name="name"
            required
            defaultValue={werte.name}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <F text={ff.name} />
        </label>

        {/* OpenProject-Projekt */}
        <div className="block text-sm sm:col-span-2">
          <span>OpenProject-Projekt</span>
          {hatProjektListe ? (
            <select
              name="openprojectProjectId"
              defaultValue={werte.openprojectProjectId ?? ""}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
            >
              <option value="">— noch kein Projekt —</option>
              {projekte!.items.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name} (#{p.id})
                </option>
              ))}
              {/* falls der gespeicherte Wert nicht in der Liste ist */}
              {werte.openprojectProjectId &&
                !projekte!.items.some(
                  (p) => String(p.id) === werte.openprojectProjectId,
                ) && (
                  <option value={werte.openprojectProjectId}>
                    Aktuell gespeichert: {werte.openprojectProjectId}
                  </option>
                )}
            </select>
          ) : (
            <>
              <input
                name="openprojectProjectId"
                defaultValue={werte.openprojectProjectId}
                placeholder="Projekt-ID oder Kennung, z. B. 42"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <p className="mt-1 text-xs text-amber-700">
                Projektliste nicht verfügbar
                {projekte?.fehler
                  ? ` — ${projekte.fehler.replace(/\.$/, "")}`
                  : ""}
                . Projekt-ID bitte manuell eintragen.
              </p>
            </>
          )}
          <F text={ff.openprojectProjectId} />
        </div>

        <label className="block text-sm">
          Stundensatz (EUR)
          <input
            name="stundensatzDefault"
            type="number"
            min={0}
            defaultValue={werte.stundensatzDefault ?? 80}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <F text={ff.stundensatzDefault} />
        </label>
        <label className="block text-sm">
          Logo-URL
          <input
            name="brandingLogoUrl"
            defaultValue={werte.brandingLogoUrl}
            placeholder="https://…"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <F text={ff.brandingLogoUrl} />
        </label>
        <label className="block text-sm">
          Akzentfarbe (Hex)
          <input
            name="brandingAccentColor"
            defaultValue={werte.brandingAccentColor}
            placeholder="#1d4ed8"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
          />
          <F text={ff.brandingAccentColor} />
        </label>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="zeigtBewertung"
          defaultChecked={werte.zeigtBewertung}
          className="mt-0.5"
        />
        <span>
          Realistischen Bewertungswert für den Kunden sichtbar machen (ab
          Reifegrad »Bewertet«). Standard: aus.
        </span>
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="kiAktiviert"
          defaultChecked={werte.kiAktiviert}
          className="mt-0.5"
        />
        <span>
          KI-Aufbereitung für diesen Kunden anbieten (der Einwilligungsschalter
          erscheint dann im Formular; die Einwilligung bleibt pro Use Case).
          Standard: aus. Wirkt nur, wenn zusätzlich ein KI-Anbieter global
          konfiguriert ist.
        </span>
      </label>

      {modus === "neu" && (
        <fieldset className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="tokenErzeugen"
              checked={tokenErzeugen}
              onChange={(e) => setTokenErzeugen(e.target.checked)}
            />
            Zugangslink jetzt erzeugen
          </label>
          {tokenErzeugen && (
            <label className="mt-2 block text-sm">
              Gültigkeit (Tage)
              <input
                name="tokenGueltigTage"
                type="number"
                min={1}
                defaultValue={365}
                className="mt-1 block w-28 rounded-md border border-gray-300 px-3 py-2"
              />
            </label>
          )}
        </fieldset>
      )}

      <Submit label={label} />
    </form>
  );
}
