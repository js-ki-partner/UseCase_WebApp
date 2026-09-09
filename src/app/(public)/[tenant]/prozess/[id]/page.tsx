import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { EinreicherChrome } from "@/components/EinreicherChrome";
import { ProzessEditor, type SchrittWert } from "./ProzessEditor";
import { speichereProzessschritte, type ProzessFormState } from "../actions";

export const dynamic = "force-dynamic";

export default async function ProzessPage({
  params,
}: PageProps<"/[tenant]/prozess/[id]">) {
  const { tenant: slug, id } = await params;
  const ctx = await requireTenant(slug);

  const useCase = await prisma.useCase.findUnique({
    where: { id },
    include: { processSteps: { orderBy: { position: "asc" } } },
  });
  if (!useCase || useCase.tenantId !== ctx.id) notFound();

  const initial: SchrittWert[] = useCase.processSteps.map((s) => ({
    bezeichnung: s.bezeichnung,
    input: s.input ?? "",
    output: s.output ?? "",
    system: s.system ?? "",
    dauerMinuten: s.dauerMinuten != null ? String(s.dauerMinuten) : "",
    hatWartezeit: s.hatWartezeit,
    brauchtEntscheidung: s.brauchtEntscheidung,
  }));

  const action = speichereProzessschritte.bind(null, useCase.id, slug) as (
    prev: ProzessFormState,
    fd: FormData,
  ) => Promise<ProzessFormState>;

  return (
    <EinreicherChrome tenant={ctx}>
      <header className="mb-6">
        <p className="text-sm text-gray-500">Use-Case-Erfassung für {ctx.name}</p>
        <h1 className="mt-1 text-2xl font-semibold">Prozessschritte erfassen</h1>
        <p className="mt-2 text-gray-700">
          Legen Sie die Schritte in ihrer Reihenfolge an. Wichtig sind vor allem
          die beiden Markierungen: wo <strong>Wartezeit</strong> entsteht und wo
          eine <strong>menschliche Entscheidung</strong> nötig ist. 10–20 Minuten.
        </p>
        <p className="mt-2 rounded-md bg-white px-3 py-2 text-sm text-gray-600">
          Bezug: „{useCase.titel || useCase.problemText.slice(0, 80)}“
        </p>
      </header>

      <ProzessEditor action={action} initial={initial} />

      <p className="mt-6 text-sm text-gray-500">
        <Link href={`/${slug}`} className="underline">
          Ohne Prozessschritte zurück
        </Link>
      </p>
    </EinreicherChrome>
  );
}
