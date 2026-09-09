import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { formatDatumZeit } from "@/lib/format";
import { werteRundeAus } from "@/lib/prio";
import { RundeAktionen } from "./RundeAktionen";

export const dynamic = "force-dynamic";

export default async function PrioRundePage({
  params,
}: PageProps<"/admin/prio/[id]">) {
  await requireAdmin();
  const { id } = await params;

  const runde = await prisma.prioRunde.findUnique({
    where: { id },
    include: { tenant: { select: { name: true } }, stimmen: { orderBy: { abgegebenAm: "desc" } } },
  });
  if (!runde) notFound();

  const auswertung = await werteRundeAus(id);
  const teilnehmerLink = `${env.appBaseUrl()}/p/${runde.zugangsCode}`;
  const maxSumme = Math.max(1, ...(auswertung?.zeilen.map((z) => z.summe) ?? [1]));

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/admin/prio" className="text-sm text-gray-500 underline">
          ← Priorisierungsrunden
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{runde.titel}</h1>
        <p className="text-sm text-gray-500">
          {runde.tenant.name} · {runde.budgetProTeilnehmer.toLocaleString("de-DE")} €
          je Teilnehmer · {runde.offen ? "offen" : "geschlossen"}
        </p>
      </div>

      <section className="rounded-md border border-gray-200 bg-white p-4">
        <h2 className="mb-2 font-medium">Teilnehmer-Link</h2>
        <p className="text-sm text-gray-600">
          Diesen Link im Workshop teilen. Kein Login nötig.
        </p>
        <code className="mt-2 block break-all rounded bg-gray-50 p-2 font-mono text-xs">
          {teilnehmerLink}
        </code>
        {!runde.offen && (
          <p className="mt-2 text-xs text-amber-700">
            Runde ist geschlossen — der Link nimmt keine Stimmen mehr an.
          </p>
        )}
      </section>

      <section className="rounded-md border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">
            Ergebnis ({auswertung?.teilnehmer ?? 0} Teilnehmer)
          </h2>
        </div>
        {auswertung && auswertung.zeilen.length > 0 ? (
          <ol className="space-y-2">
            {auswertung.zeilen.map((z, i) => (
              <li key={z.useCaseId}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>
                    <span className="text-gray-400">{i + 1}.</span> {z.titel}
                  </span>
                  <span className="font-medium">
                    {z.summe.toLocaleString("de-DE")} €{" "}
                    <span className="text-gray-400">
                      ({Math.round(z.anteil * 100)} %, {z.stimmen} St.)
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-2 rounded bg-gray-100">
                  <div
                    className="accent-bg h-2 rounded"
                    style={{ width: `${(z.summe / maxSumme) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-gray-500">Noch keine Stimmen abgegeben.</p>
        )}
      </section>

      <RundeAktionen prioRundeId={runde.id} offen={runde.offen} />

      {runde.stimmen.length > 0 && (
        <section>
          <h2 className="mb-2 font-medium">Abgegebene Stimmen</h2>
          <ul className="space-y-1 text-sm text-gray-600">
            {runde.stimmen.map((s) => (
              <li key={s.id}>
                {s.teilnehmerName || "anonym"} · {formatDatumZeit(s.abgegebenAm)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
