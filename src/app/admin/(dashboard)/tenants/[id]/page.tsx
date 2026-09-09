import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { formatDatum, formatDatumZeit } from "@/lib/format";
import { listeProjekte } from "@/lib/openproject";
import { TenantForm } from "../TenantForm";
import { TokenPanel } from "./TokenPanel";
import { KontaktPanel } from "./KontaktPanel";
import { aktualisiereTenant } from "../tenant-actions";

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({
  params,
}: PageProps<"/admin/tenants/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: { kontakte: { orderBy: { createdAt: "asc" } } },
  });
  if (!tenant) notFound();

  const projekte = await listeProjekte();

  const action = aktualisiereTenant.bind(null, tenant.id) as Parameters<
    typeof TenantForm
  >[0]["action"];

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/admin/tenants" className="text-sm text-gray-500 underline">
          ← Kunden
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{tenant.name}</h1>
      </div>

      <section className="rounded-md border border-gray-200 bg-white p-4">
        <h2 className="mb-3 font-medium">Stammdaten</h2>
        <TenantForm
          action={action}
          label="Speichern"
          modus="bearbeiten"
          projekte={{
            ok: projekte.ok,
            items: projekte.projekte,
            fehler: projekte.fehler,
          }}
          werte={{
            slug: tenant.slug,
            name: tenant.name,
            openprojectProjectId: tenant.openprojectProjectId ?? "",
            stundensatzDefault: tenant.stundensatzDefault,
            brandingLogoUrl: tenant.brandingLogoUrl ?? "",
            brandingAccentColor: tenant.brandingAccentColor ?? "",
            zeigtBewertung: tenant.zeigtBewertung,
            kiAktiviert: tenant.kiAktiviert,
          }}
        />
      </section>

      <section className="rounded-md border border-gray-200 bg-white p-4">
        <h2 className="mb-1 font-medium">Zugangstoken (Einreicher)</h2>
        <p className="mb-3 text-sm text-gray-500">
          Geteilter Link, den der Kunde intern verteilt.
        </p>
        <TokenPanel
          tenantId={tenant.id}
          slug={tenant.slug}
          hatToken={Boolean(tenant.accessTokenHash)}
          gueltigBis={formatDatum(tenant.tokenExpiresAt)}
          appBaseUrl={env.appBaseUrl()}
        />
      </section>

      <section className="rounded-md border border-gray-200 bg-white p-4">
        <h2 className="mb-1 font-medium">Ansprechpartner (Dashboard-Zugang)</h2>
        <p className="mb-3 text-sm text-gray-500">
          Persönlicher Link zum Portfolio-Dashboard des Hauses (Konzept
          Abschnitt 3).
        </p>
        <KontaktPanel
          tenantId={tenant.id}
          kontakte={tenant.kontakte.map((k) => ({
            id: k.id,
            name: k.name,
            email: k.email,
            hatZugang: Boolean(k.zugangTokenHash),
            gueltigBis: formatDatum(k.tokenExpiresAt),
            letzterLogin: k.letzterLoginAm
              ? formatDatumZeit(k.letzterLoginAm)
              : "—",
          }))}
        />
      </section>
    </div>
  );
}
