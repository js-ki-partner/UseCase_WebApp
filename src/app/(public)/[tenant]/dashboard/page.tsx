import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireKontakt } from "@/lib/kontakt";
import { EinreicherChrome } from "@/components/EinreicherChrome";
import { kundenFortschritt } from "@/lib/openproject";
import { formatEuro } from "@/lib/bewertung";
import { formatDatum, frequenzLabel, reifegradLabel } from "@/lib/format";
import { KontextForm } from "./KontextForm";

export const dynamic = "force-dynamic";

const FORTSCHRITT_STUFEN = [
  { key: "eingegangen", label: "Eingegangen" },
  { key: "in_pruefung", label: "In Prüfung" },
  { key: "eingeplant", label: "Eingeplant" },
  { key: "in_umsetzung", label: "In Umsetzung" },
  { key: "umgesetzt", label: "Umgesetzt" },
];

function stufeFuer(statusKey: string | null): string {
  const l = kundenFortschritt(statusKey);
  if (l === "In Prüfung") return "in_pruefung";
  if (l === "Eingeplant") return "eingeplant";
  if (l === "In Umsetzung") return "in_umsetzung";
  if (l === "Umgesetzt") return "umgesetzt";
  if (l === "Nicht weiterverfolgt") return "nicht";
  return "eingegangen";
}

export default async function DashboardPage({
  params,
}: PageProps<"/[tenant]/dashboard">) {
  const { tenant: slug } = await params;
  const { tenant: ctx, name: kontaktName } = await requireKontakt(slug);

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

  const proStufe = new Map<string, number>();
  for (const uc of useCases) {
    const s = stufeFuer(uc.openprojectStatusKey);
    proStufe.set(s, (proStufe.get(s) ?? 0) + 1);
  }

  return (
    <EinreicherChrome tenant={ctx}>
      <header className="mb-6">
        <p className="text-sm text-gray-500">Dashboard · {kontaktName}</p>
        <h1 className="mt-1 text-2xl font-semibold">
          Use-Case-Portfolio {ctx.name}
        </h1>
        <p className="mt-2 text-gray-700">
          Alle Einreichungen aus Ihrem Haus, ihr Stand in der Umsetzung und Ihre
          Ergänzungen.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kachel k="Use Cases" v={String(useCases.length)} />
        <Kachel
          k="Potenzial gesamt"
          v={`${gesamtStunden.toLocaleString("de-DE")} h/Jahr`}
        />
        <Kachel
          k="in Umsetzung / umgesetzt"
          v={String(
            (proStufe.get("in_umsetzung") ?? 0) + (proStufe.get("umgesetzt") ?? 0),
          )}
        />
        {wertSichtbar && gesamtWert > 0 && (
          <Kachel k="Wert (realistisch, Σ)" v={formatEuro(gesamtWert)} />
        )}
      </div>

      {/* Fortschritts-Trichter */}
      <div className="mb-8 flex flex-wrap gap-2 text-sm">
        {FORTSCHRITT_STUFEN.map((st) => (
          <span
            key={st.key}
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5"
          >
            {st.label}: <strong>{proStufe.get(st.key) ?? 0}</strong>
          </span>
        ))}
        {(proStufe.get("nicht") ?? 0) > 0 && (
          <span className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-gray-500">
            Nicht weiterverfolgt: {proStufe.get("nicht")}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {useCases.map((uc) => (
          <div
            key={uc.id}
            className="rounded-md border border-gray-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {uc.titel ||
                    uc.problemText.slice(0, 90) +
                      (uc.problemText.length > 90 ? "…" : "")}
                </p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {uc.rolle} · {frequenzLabel(uc.frequenz)} ·{" "}
                  {uc.stundenpotenzialPa.toLocaleString("de-DE")} h/Jahr ·{" "}
                  {reifegradLabel(uc.reifegrad)} · seit {formatDatum(uc.createdAt)}
                </p>
              </div>
              <span className="accent-border rounded-full border px-3 py-1 text-xs">
                {kundenFortschritt(uc.openprojectStatusKey)}
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

            <KontextForm
              useCaseId={uc.id}
              slug={slug}
              wert={uc.kundenkontext ?? ""}
            />
          </div>
        ))}
        {useCases.length === 0 && (
          <p className="rounded-md border border-gray-200 bg-white p-6 text-center text-gray-500">
            Noch keine Einreichungen aus Ihrem Haus.
          </p>
        )}
      </div>

      <div className="mt-8">
        <Link
          href={`/${slug}`}
          className="accent-text text-sm underline"
        >
          Zum Einreichungsformular →
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
