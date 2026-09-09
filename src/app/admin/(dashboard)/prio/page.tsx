import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { formatDatum } from "@/lib/format";
import { NeueRundeForm, type TenantMitUseCases } from "./NeueRundeForm";

export const dynamic = "force-dynamic";

export default async function PrioPage() {
  await requireAdmin();

  const [runden, tenants] = await Promise.all([
    prisma.prioRunde.findMany({
      orderBy: { createdAt: "desc" },
      include: { tenant: { select: { name: true } }, _count: { select: { stimmen: true } } },
    }),
    prisma.tenant.findMany({
      orderBy: { name: "asc" },
      include: {
        useCases: {
          where: { status: { notIn: ["DUPLIKAT", "ABGELEHNT"] } },
          orderBy: { stundenpotenzialPa: "desc" },
          select: { id: true, titel: true, problemText: true, stundenpotenzialPa: true },
        },
      },
    }),
  ]);

  const tenantsMitUc: TenantMitUseCases[] = tenants
    .filter((t) => t.useCases.length >= 2)
    .map((t) => ({
      id: t.id,
      name: t.name,
      useCases: t.useCases.map((u) => ({
        id: u.id,
        label: u.titel || u.problemText.slice(0, 60),
        potenzial: u.stundenpotenzialPa,
      })),
    }));

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <h1 className="text-xl font-semibold">Priorisierungsrunden</h1>
        <div className="mt-4 overflow-x-auto rounded-md border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Titel</th>
                <th className="px-3 py-2">Kunde</th>
                <th className="px-3 py-2 text-right">Teilnehmer</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Angelegt</th>
              </tr>
            </thead>
            <tbody>
              {runden.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-3 py-2">
                    <Link href={`/admin/prio/${r.id}`} className="accent-text underline">
                      {r.titel}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{r.tenant.name}</td>
                  <td className="px-3 py-2 text-right">{r._count.stimmen}</td>
                  <td className="px-3 py-2">{r.offen ? "offen" : "geschlossen"}</td>
                  <td className="px-3 py-2 text-gray-500">{formatDatum(r.createdAt)}</td>
                </tr>
              ))}
              {runden.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                    Noch keine Runde angelegt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Neue Runde</h2>
        <p className="mt-1 text-sm text-gray-600">
          Fiktives Budget je Teilnehmer, verteilt auf Use-Case-Karten (Konzept
          Abschnitt 10).
        </p>
        <div className="mt-4 rounded-md border border-gray-200 bg-white p-4">
          {tenantsMitUc.length > 0 ? (
            <NeueRundeForm tenants={tenantsMitUc} />
          ) : (
            <p className="text-sm text-gray-500">
              Kein Kunde mit mindestens zwei abstimmbaren Use Cases.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
