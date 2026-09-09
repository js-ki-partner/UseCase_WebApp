"use client";

import { useEffect, useRef } from "react";
import { KI_HINWEIS_VERSION, kiDialogText } from "@/lib/ki";

/**
 * Zweistufige Einwilligung (Konzept 4.6):
 *  Stufe A — Schalter mit einzeiligem Hinweis.
 *  Stufe B — Bestätigungsdialog; nur „Verstanden" schaltet wirklich ein.
 *
 * `aktiv` / `onChange` werden vom Formular gehalten, damit der Absenden-Button
 * den Zustand anzeigen kann. Rendert die Hidden-Inputs für die Server Action.
 */
export function KiEinwilligungSchalter({
  aktiv,
  onChange,
  dialogOffen,
  setDialogOffen,
  verfuegbar,
}: {
  aktiv: boolean;
  onChange: (an: boolean) => void;
  dialogOffen: boolean;
  setDialogOffen: (offen: boolean) => void;
  verfuegbar: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const t = kiDialogText();

  useEffect(() => {
    if (!dialogOffen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDialogOffen(false);
        onChange(false);
      }
    };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector("button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [dialogOffen, onChange, setDialogOffen]);

  return (
    <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
      {aktiv && (
        <>
          <input type="hidden" name="kiEinwilligung" value="on" />
          <input type="hidden" name="kiHinweisVersion" value={KI_HINWEIS_VERSION} />
        </>
      )}

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={aktiv}
          disabled={!verfuegbar}
          onChange={(e) => {
            if (e.target.checked) {
              setDialogOffen(true); // Schalter allein löst nichts aus (Stufe A)
            } else {
              onChange(false);
            }
          }}
        />
        <span>
          Meine Eingaben durch KI aufbereiten lassen (optional)
          <span className="mt-0.5 block text-xs text-gray-500">
            {verfuegbar
              ? "Dabei werden Inhalte dieses Use Case an einen externen Dienst übermittelt. Details im folgenden Dialog."
              : "Derzeit nicht verfügbar — Ihr Use Case wird ausschließlich auf dem Server von KI Partner verarbeitet."}
          </span>
        </span>
      </label>

      {dialogOffen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            setDialogOffen(false);
            onChange(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t.titel}
            className="max-h-[90vh] max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">{t.titel}</h2>
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              {t.absaetze.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDialogOffen(false);
                  onChange(false);
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm"
              >
                {t.abbrechen}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDialogOffen(false);
                  onChange(true);
                }}
                className="accent-bg rounded-md px-4 py-2 text-sm font-medium text-white"
              >
                {t.bestaetigen}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
