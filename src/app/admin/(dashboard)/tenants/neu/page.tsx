import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { listeProjekte } from "@/lib/openproject";
import { TenantForm } from "../TenantForm";
import { erstelleTenant } from "../tenant-actions";

export const dynamic = "force-dynamic";

export default async function NeuerKundePage() {
  await requireAdmin();
  const projekte = await listeProjekte();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/tenants" className="text-sm text-gray-500 underline">
          ← Kunden
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Neuen Kunden anlegen</h1>
        <p className="mt-1 text-sm text-gray-600">
          Stammdaten und OpenProject-Projekt festlegen und optional gleich den
          Kundenlink erzeugen.
        </p>
      </div>

      <div className="rounded-md border border-gray-200 bg-white p-4">
        <TenantForm
          action={erstelleTenant}
          label="Kunde anlegen"
          modus="neu"
          projekte={{
            ok: projekte.ok,
            items: projekte.projekte,
            fehler: projekte.fehler,
          }}
          appBaseUrl={env.appBaseUrl()}
        />
      </div>
    </div>
  );
}
