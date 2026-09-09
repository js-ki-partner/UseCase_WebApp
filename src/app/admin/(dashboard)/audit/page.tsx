import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { formatDatumZeit } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireAdmin();
  const eintraege = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-xl font-semibold">Audit-Protokoll</h1>
      <p className="mt-1 text-sm text-gray-500">
        Letzte 200 Ereignisse. Ohne Inhalte — nur wer, was und wann (Konzept
        Abschnitt 7).
      </p>

      <div className="mt-4 overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Zeitpunkt</th>
              <th className="px-3 py-2">Akteur</th>
              <th className="px-3 py-2">Aktion</th>
              <th className="px-3 py-2">Ziel</th>
              <th className="px-3 py-2">IP</th>
              <th className="px-3 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {eintraege.map((e) => (
              <tr key={e.id} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                  {formatDatumZeit(e.createdAt)}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{e.actor}</td>
                <td className="px-3 py-2">{e.aktion}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {e.zielTyp ? `${e.zielTyp}:${e.zielId ?? "—"}` : "—"}
                </td>
                <td className="px-3 py-2 text-gray-500">{e.ip ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">
                  {e.detail ? JSON.stringify(e.detail) : "—"}
                </td>
              </tr>
            ))}
            {eintraege.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                  Noch keine Ereignisse.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
