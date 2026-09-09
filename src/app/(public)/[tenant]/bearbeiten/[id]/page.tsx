import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { EinreicherChrome } from "@/components/EinreicherChrome";
import { kundenFortschritt } from "@/lib/openproject";
import { formatEuro } from "@/lib/bewertung";
import { KurzerfassungForm } from "../../KurzerfassungForm";
import { ergaenzeKurzerfassung, type FormState } from "../../actions";

export const dynamic = "force-dynamic";

export default async function BearbeitenPage({
  params,
}: PageProps<"/[tenant]/bearbeiten/[id]">) {
  const { tenant: slug, id } = await params;
  const ctx = await requireTenant(slug);

  const useCase = await prisma.useCase.findUnique({
    where: { id },
    include: {
      _count: { select: { processSteps: true } },
      assessment: { select: { wertReal: true } },
    },
  });
  if (!useCase || useCase.tenantId !== ctx.id) notFound();

  const zeigtWert =
    ctx.zeigtBewertung &&
    useCase.reifegrad === "BEWERTET" &&
    useCase.assessment?.wertReal != null;

  const action = ergaenzeKurzerfassung.bind(null, useCase.id, slug) as (
    prev: FormState,
    fd: FormData,
  ) => Promise<FormState>;

  return (
    <EinreicherChrome tenant={ctx}>
      <header className="mb-8">
        <p className="text-sm text-gray-500">Use-Case-Erfassung für {ctx.name}</p>
        <h1 className="mt-1 text-2xl font-semibold">Ihren Use Case ergänzen</h1>
        <p className="mt-2 text-gray-700">
          Sie können die Angaben korrigieren oder vervollständigen.
        </p>
      </header>

      {(useCase.openprojectWpId || zeigtWert) && (
        <div className="accent-border mb-8 rounded-md border-l-4 bg-white px-4 py-3">
          {useCase.openprojectWpId && (
            <>
              <p className="text-sm text-gray-600">Aktueller Stand</p>
              <p className="text-lg font-semibold">
                {kundenFortschritt(useCase.openprojectStatusKey)}
              </p>
            </>
          )}
          {zeigtWert && (
            <p className="mt-1 text-sm text-gray-600">
              Geschätzter jährlicher Wert (Richtwert):{" "}
              <span className="font-semibold text-gray-900">
                {formatEuro(useCase.assessment!.wertReal)}
              </span>
            </p>
          )}
        </div>
      )}

      <KurzerfassungForm
        action={action}
        modus="ergaenzen"
        defaults={{
          problemText: useCase.problemText,
          rolle: useCase.rolle,
          anzahlBetroffene: useCase.anzahlBetroffene,
          frequenz: useCase.frequenz,
          dauerMinuten: useCase.dauerMinuten,
          wunschergebnis: useCase.wunschergebnis ?? undefined,
          einreicherName: useCase.einreicherName ?? undefined,
          einreicherEmail: useCase.einreicherEmail ?? undefined,
          istAnonym: useCase.istAnonym,
        }}
      />

      <div className="mt-8 rounded-md border border-gray-200 bg-white p-4">
        <h2 className="font-medium">Prozessschritte</h2>
        <p className="mt-1 text-sm text-gray-600">
          {useCase._count.processSteps > 0
            ? `${useCase._count.processSteps} Schritt(e) erfasst.`
            : "Noch keine erfasst — zeigt, wo Wartezeit entsteht und wo Menschen entscheiden."}
        </p>
        <Link
          href={`/${slug}/prozess/${useCase.id}`}
          className="accent-text mt-2 inline-block text-sm underline"
        >
          {useCase._count.processSteps > 0
            ? "Prozessschritte bearbeiten"
            : "Prozessschritte erfassen"}{" "}
          →
        </Link>
      </div>
    </EinreicherChrome>
  );
}
