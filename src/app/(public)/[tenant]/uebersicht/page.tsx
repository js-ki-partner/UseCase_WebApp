import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { EinreicherChrome } from "@/components/EinreicherChrome";
import { kundenFortschritt } from "@/lib/openproject";
import { formatEuro } from "@/lib/bewertung";
import { frequenzLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function UebersichtPage({
  params,
}: PageProps<"/[tenant]/uebersicht">) {
  const { tenant: slug } = await params;
  const ctx = await requireTenant(slug);

  const useCases = await prisma.useCase.findMany({
    where: { tenantId: ctx.id, status: { notIn: ["DUPLIKAT"] } },
    include: {
      assessment: { select: { wertReal: true } },
      _count: { select: { processSteps: true } },
    },
    orderBy: [{ stundenpotenzialPa: "desc" }, { createdAt: "desc" }],
  });

  const gesamtStunden = useCases.reduce((s, uc) => s + uc.stundenpotenzialPa, 0);
  const wertSichtbar = ctx.zeigtBewertung;
  const gesamtWert = wertSichtbar
    ? useCases.reduce(
        (s, uc) =>
          uc.reifegrad === "BEWERTET" && uc.assessment?.wertReal != null
            ? s + uc.assessment.wertReal
            : s,
        0,
      )
    : 0;
  const inUmsetzung = useCases.filter((uc) =>
    ["priorisiert", "in_umsetzung", "umgesetzt"].includes(
      uc.openprojectStatusKey ?? "",
    ),
  ).length;

  return (
    <EinreicherChrome tenant={ctx}>
      <header className="mb-6">
        <p className="text-sm text-gray-500">{ctx.name}</p>
        <h1 className="mt-1 text-2xl font-semibold">Ihr Use-Case-Portfolio</h1>
        <p className="mt-2 text-gray-700">
          Überblick über alle Einreichungen aus Ihrem Haus und ihren Stand.
        </p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kachel k="Use Cases" v={String(useCases.length)} />
        <Kachel
          k="Potenzial gesamt"
          v={`${gesamtStunden.toLocaleString("de-DE")} h/Jahr`}
        />
        <Kachel k="in Umsetzung / umgesetzt" v={String(inUmsetzung)} />
        {wertSichtbar && gesamtWert > 0 && (
          <Kachel k="Wert (realistisch, Σ)" v={formatEuro(gesamtWert)} />
        )}
      </div>

      <div className="space-y-3">
        {useCases.map((uc) => (
          <div
            key={uc.id}
            className="rounded-md border border-gray-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {uc.titel ||
                    uc.problemText.slice(0, 80) +
                      (uc.problemText.length > 80 ? "…" : "")}
                </p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {uc.rolle} · {frequenzLabel(uc.frequenz)} ·{" "}
                  {uc.stundenpotenzialPa.toLocaleString("de-DE")} h/Jahr
                </p>
              </div>
              <span className="accent-border rounded-full border px-3 py-1 text-xs">
                {uc.openprojectStatusKey
                  ? kundenFortschritt(uc.openprojectStatusKey)
                  : "Eingegangen"}
              </span>
            </div>
            {wertSichtbar &&
              uc.reifegrad === "BEWERTET" &&
              uc.assessment?.wertReal != null && (
                <p className="mt-2 text-sm text-gray-600">
                  Geschätzter jährlicher Wert (Richtwert):{" "}
                  <span className="font-medium text-gray-900">
                    {formatEuro(uc.assessment.wertReal)}
                  </span>
                </p>
              )}
            <p className="mt-2 text-sm">
              <Link
                href={`/${slug}/prozess/${uc.id}`}
                className="accent-text underline"
              >
                {uc._count.processSteps > 0
                  ? `Prozessschritte bearbeiten (${uc._count.processSteps})`
                  : "Prozessschritte erfassen"}
              </Link>{" "}
              <span className="text-gray-400">→</span>
            </p>
          </div>
        ))}
        {useCases.length === 0 && (
          <p className="rounded-md border border-gray-200 bg-white p-6 text-center text-gray-500">
            Noch keine Einreichungen.
          </p>
        )}
      </div>

      <div className="mt-8">
        <Link
          href={`/${slug}`}
          className="accent-bg rounded-md px-5 py-2.5 font-medium text-white"
        >
          Neuen Use Case einreichen
        </Link>
      </div>
    </EinreicherChrome>
  );
}

function Kachel({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
      <p className="text-xs text-gray-500">{k}</p>
      <p className="mt-0.5 font-semibold">{v}</p>
    </div>
  );
}
