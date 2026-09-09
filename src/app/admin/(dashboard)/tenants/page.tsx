import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { formatDatum } from "@/lib/format";
import { listeProjekte } from "@/lib/openproject";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  await requireAdmin();
  const [tenants, projekte] = await Promise.all([
    prisma.tenant.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { useCases: true } } },
    }),
    listeProjekte(),
  ]);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Kunden</h1>
        <Link
          href="/admin/tenants/neu"
          className="accent-bg rounded-md px-4 py-2 text-sm font-medium text-white"
        >
          + Neuen Kunden anlegen
        </Link>
      </div>

      <p
        className={`mt-3 rounded-md border px-3 py-2 text-sm ${
          projekte.ok
            ? "border-green-300 bg-green-50 text-green-800"
            : "border-amber-300 bg-amber-50 text-amber-800"
        }`}
      >
        {projekte.ok
          ? `OpenProject verbunden — ${projekte.projekte.length} aktive Projekte verfügbar.`
          : `OpenProject nicht verbunden: ${projekte.fehler ?? "unbekannt"}`}
      </p>

      <div className="mt-4 overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">OpenProject</th>
              <th className="px-3 py-2 text-right">Use Cases</th>
              <th className="px-3 py-2">Zugangslink</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/tenants/${t.id}`}
                    className="accent-text underline"
                  >
                    {t.name}
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{t.slug}</td>
                <td className="px-3 py-2 text-gray-600">
                  {t.openprojectProjectId
                    ? `#${t.openprojectProjectId}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right">{t._count.useCases}</td>
                <td className="px-3 py-2 text-gray-500">
                  {t.accessTokenHash
                    ? `aktiv bis ${formatDatum(t.tokenExpiresAt)}`
                    : "kein Token"}
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                  Noch keine Kunden angelegt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
