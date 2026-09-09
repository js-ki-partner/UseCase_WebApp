import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { formatDatum, frequenzLabel, statusLabel } from "@/lib/format";
import { FortschrittRefreshButton } from "./FortschrittRefreshButton";

export const dynamic = "force-dynamic";

const STATUS_FILTER = [
  "ALLE",
  "EINGEREICHT",
  "IN_PRUEFUNG",
  "UEBERTRAGEN",
  "WARTELISTE",
  "ABGELEHNT",
  "DUPLIKAT",
] as const;

export default async function EingangskorbPage({
  searchParams,
}: PageProps<"/admin">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "ALLE";
  const tenantSlug = typeof sp.tenant === "string" ? sp.tenant : "";

  const tenants = await prisma.tenant.findMany({ orderBy: { name: "asc" } });

  const useCases = await prisma.useCase.findMany({
    where: {
      ...(status !== "ALLE" ? { status: status as never } : {}),
      ...(tenantSlug ? { tenant: { slug: tenantSlug } } : {}),
    },
    include: { tenant: true, _count: { select: { duplikate: true } } },
    orderBy: [{ stundenpotenzialPa: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-xl font-semibold">Eingangskorb</h1>
        <form className="flex gap-2 text-sm">
          <select
            name="tenant"
            defaultValue={tenantSlug}
            className="rounded-md border border-gray-300 px-2 py-1"
          >
            <option value="">Alle Kunden</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={status}
            className="rounded-md border border-gray-300 px-2 py-1"
          >
            {STATUS_FILTER.map((s) => (
              <option key={s} value={s}>
                {s === "ALLE" ? "Alle Status" : statusLabel(s)}
              </option>
            ))}
          </select>
          <button className="rounded-md border border-gray-300 px-3 py-1">
            Filtern
          </button>
        </form>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-500">
          {useCases.length} Einträge, sortiert nach geschätztem Potenzial.
        </p>
        <FortschrittRefreshButton />
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Titel / Problem</th>
              <th className="px-3 py-2">Kunde</th>
              <th className="px-3 py-2">Rolle</th>
              <th className="px-3 py-2">Frequenz</th>
              <th className="px-3 py-2 text-right">h/Jahr</th>
              <th className="px-3 py-2">Status (App)</th>
              <th className="px-3 py-2">OpenProject</th>
              <th className="px-3 py-2">Eingang</th>
            </tr>
          </thead>
          <tbody>
            {useCases.map((uc) => (
              <tr key={uc.id} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2">
                  <Link href={`/admin/uc/${uc.id}`} className="accent-text underline">
                    {uc.titel || uc.problemText.slice(0, 70) + (uc.problemText.length > 70 ? "…" : "")}
                  </Link>
                  {uc._count.duplikate > 0 && (
                    <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      +{uc._count.duplikate} Duplikat(e)
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">{uc.tenant.name}</td>
                <td className="px-3 py-2">{uc.rolle}</td>
                <td className="px-3 py-2">{frequenzLabel(uc.frequenz)}</td>
                <td className="px-3 py-2 text-right font-medium">
                  {uc.stundenpotenzialPa.toLocaleString("de-DE")}
                </td>
                <td className="px-3 py-2">{statusLabel(uc.status)}</td>
                <td className="px-3 py-2 text-gray-600">
                  {uc.openprojectStatusName ??
                    (uc.openprojectWpId ? "—" : "")}
                </td>
                <td className="px-3 py-2 text-gray-500">{formatDatum(uc.createdAt)}</td>
              </tr>
            ))}
            {useCases.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                  Keine Einträge für diese Auswahl.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
