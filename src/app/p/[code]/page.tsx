import type { CSSProperties } from "react";
import { prisma } from "@/lib/prisma";
import { KiPartnerLogo } from "@/components/KiPartnerLogo";
import { frequenzLabel } from "@/lib/format";
import { PrioVoteForm, type Karte } from "./PrioVoteForm";

export const dynamic = "force-dynamic";

export default async function PrioTeilnehmerPage({
  params,
}: PageProps<"/p/[code]">) {
  const { code } = await params;
  const runde = await prisma.prioRunde.findUnique({
    where: { zugangsCode: code },
    include: { tenant: true },
  });

  if (!runde) {
    return <Hinweis titel="Link ungültig" text="Diese Priorisierungsrunde gibt es nicht." />;
  }

  const style = runde.tenant.brandingAccentColor
    ? ({ ["--accent"]: runde.tenant.brandingAccentColor } as CSSProperties)
    : undefined;

  if (!runde.offen) {
    return (
      <Hinweis
        titel="Runde geschlossen"
        text="Diese Priorisierungsrunde nimmt keine Stimmen mehr an. Danke fürs Mitmachen."
        style={style}
      />
    );
  }

  const ids = (runde.useCaseIds as string[]) ?? [];
  const useCases = await prisma.useCase.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      titel: true,
      problemText: true,
      rolle: true,
      frequenz: true,
      stundenpotenzialPa: true,
    },
  });
  const vonId = new Map(useCases.map((u) => [u.id, u]));
  const karten: Karte[] = ids
    .map((id) => vonId.get(id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .map((u) => ({
      id: u.id,
      titel: u.titel || u.problemText.slice(0, 70),
      problem: u.problemText.slice(0, 160),
      rolle: u.rolle,
      frequenz: frequenzLabel(u.frequenz),
      stunden: u.stundenpotenzialPa,
    }));

  return (
    <div style={style} className="flex min-h-screen flex-col">
      <header className="accent-border border-b-2 bg-white">
        <div className="mx-auto max-w-2xl px-6 py-4">
          <p className="text-sm text-gray-500">{runde.tenant.name}</p>
          <h1 className="mt-1 text-2xl font-semibold">{runde.titel}</h1>
          <p className="mt-2 text-sm text-gray-700">
            Sie haben <strong>{runde.budgetProTeilnehmer.toLocaleString("de-DE")} €</strong>{" "}
            fiktives Budget. Verteilen Sie es so auf die Use Cases, wie Sie die
            Prioritäten setzen würden. Sie müssen nicht alles ausgeben.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        <PrioVoteForm
          code={code}
          budget={runde.budgetProTeilnehmer}
          karten={karten}
        />
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-6 py-4 text-xs text-gray-500">
          <span>Priorisierung — bereitgestellt von</span>
          <KiPartnerLogo className="h-5 w-auto text-gray-700" />
        </div>
      </footer>
    </div>
  );
}

function Hinweis({
  titel,
  text,
  style,
}: {
  titel: string;
  text: string;
  style?: CSSProperties;
}) {
  return (
    <main style={style} className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">{titel}</h1>
      <p className="mt-4 text-gray-700">{text}</p>
    </main>
  );
}
