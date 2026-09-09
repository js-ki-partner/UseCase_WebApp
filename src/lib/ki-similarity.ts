import { prisma } from "./prisma";

// Ähnlichkeitsprüfung (Konzept 4.6). Läuft rein lokal — keine Daten verlassen
// den Server, daher unabhängig von der KI-Einwilligung. Aktuell lexikalisch
// (Token-Jaccard); später durch ein lokales Embedding-Modell ersetzbar.

const STOPP = new Set([
  "der","die","das","und","oder","ist","sind","ein","eine","einen","einem","einer",
  "im","in","an","am","auf","für","mit","von","zu","zum","zur","den","dem","des",
  "wird","werden","muss","müssen","kann","können","wenn","dann","auch","noch","aus",
  "bei","nach","über","unter","als","wie","dass","es","sich","wir","ich","sie","er",
]);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-zäöüß0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOPP.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let schnitt = 0;
  for (const t of a) if (b.has(t)) schnitt++;
  return schnitt / (a.size + b.size - schnitt);
}

export interface AehnlicherTreffer {
  useCaseId: string;
  titel: string;
  score: number;
}

/**
 * Findet ähnliche Einträge desselben Kunden (Konzept 4.6: „drei Kolleginnen
 * haben etwas Ähnliches gemeldet").
 */
export async function findeAehnliche(
  tenantId: string,
  useCaseId: string,
  maxTreffer = 3,
  schwelle = 0.07,
): Promise<AehnlicherTreffer[]> {
  const ziel = await prisma.useCase.findUnique({
    where: { id: useCaseId },
    select: { problemText: true, wunschergebnis: true, rolle: true },
  });
  if (!ziel) return [];
  const zielTokens = tokens(
    `${ziel.problemText} ${ziel.wunschergebnis ?? ""} ${ziel.rolle}`,
  );

  const andere = await prisma.useCase.findMany({
    where: {
      tenantId,
      id: { not: useCaseId },
      status: { notIn: ["DUPLIKAT", "ABGELEHNT"] },
    },
    select: {
      id: true,
      titel: true,
      problemText: true,
      wunschergebnis: true,
      rolle: true,
    },
    take: 500,
  });

  return andere
    .map((u) => ({
      useCaseId: u.id,
      titel: u.titel || u.problemText.slice(0, 60),
      score: jaccard(
        zielTokens,
        tokens(`${u.problemText} ${u.wunschergebnis ?? ""} ${u.rolle}`),
      ),
    }))
    .filter((t) => t.score >= schwelle)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxTreffer);
}
