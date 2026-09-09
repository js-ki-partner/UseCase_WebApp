import { KI_KATEGORIEN, type KiKategorie, type KiNutzlast } from "./ki";

// Anbieter-Abstraktion für die externe KI-Anreicherung (Konzept 4.6).
// Der konkrete Anbieter (EU-Endpunkt, AV-Vertrag, keine Trainingsnutzung) wird
// über Umgebungsvariablen gewählt. Ohne Konfiguration: kein externer Aufruf.

export interface KiErgebnis {
  titelVorschlag: string | null;
  kategorie: KiKategorie | null;
  extrahierteSysteme: string[];
}

export interface KiProvider {
  name: string;
  modell: string;
  anreichern(nutzlast: KiNutzlast): Promise<KiErgebnis>;
}

const SYSTEM_PROMPT = `Du hilfst dabei, eingereichte Prozess-Beschreibungen für ein Use-Case-Portfolio aufzubereiten.
Antworte ausschließlich mit JSON in genau diesem Schema:
{"titel": string, "kategorie": string, "systeme": string[]}
- "titel": kurzer Titel in der Form "Tätigkeit + Gegenstand", max. 8 Wörter, deutsch.
- "kategorie": genau einer dieser Werte: ${KI_KATEGORIEN.join(", ")}.
- "systeme": genannte IT-Systeme/Werkzeuge als Liste, sonst [].
Keine Erklärungen, keine personenbezogenen Daten erfinden.`;

function baueUserPrompt(n: KiNutzlast): string {
  const schritte =
    n.prozessschritte.length > 0
      ? "\nProzessschritte:\n" +
        n.prozessschritte
          .map(
            (s) =>
              `${s.position}. ${s.bezeichnung}` +
              (s.system ? ` [System: ${s.system}]` : ""),
          )
          .join("\n")
      : "";
  return `Problem: ${n.problemText}
Wunschergebnis: ${n.wunschergebnis ?? "—"}
Rolle: ${n.rolle}
Häufigkeit: ${n.frequenz}, Dauer je Fall: ${n.dauerMinuten} Min., Betroffene: ${n.anzahlBetroffene}${schritte}`;
}

function normalisiereErgebnis(roh: unknown): KiErgebnis {
  const o = (roh ?? {}) as Record<string, unknown>;
  const titel = typeof o.titel === "string" ? o.titel.trim().slice(0, 120) : null;
  const kat = KI_KATEGORIEN.find((k) => k === o.kategorie) ?? null;
  const systeme = Array.isArray(o.systeme)
    ? o.systeme.filter((s): s is string => typeof s === "string" && s.trim() !== "")
    : [];
  return { titelVorschlag: titel || null, kategorie: kat, extrahierteSysteme: systeme };
}

/** Mock-Anbieter (KI_PROVIDER=mock) — nur zum Testen der Pipeline, kein Netz. */
const mockProvider: KiProvider = {
  name: "mock",
  modell: "mock-1",
  async anreichern(n) {
    const wort = n.problemText.split(/\s+/).slice(0, 3).join(" ");
    return {
      titelVorschlag: `Bearbeitung: ${wort}`.slice(0, 80),
      kategorie: "Sonstiges",
      extrahierteSysteme: [
        ...new Set(n.prozessschritte.map((s) => s.system).filter((s): s is string => !!s)),
      ],
    };
  },
};

/** OpenAI-kompatibler Chat-Completions-Endpunkt (KI_PROVIDER=openai-compatible). */
function openAiCompatibleProvider(): KiProvider | null {
  const baseUrl = process.env.KI_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.KI_API_KEY;
  const modell = process.env.KI_MODELL || "gpt-4o-mini";
  if (!baseUrl || !apiKey) return null;

  return {
    name: process.env.KI_ANBIETER_NAMEN || "OpenAI-kompatibel",
    modell,
    async anreichern(n) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        signal: AbortSignal.timeout(30000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modell,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: baueUserPrompt(n) },
          ],
        }),
      });
      if (!res.ok) {
        throw new Error(`KI-Anbieter ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }
      const daten = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = daten.choices?.[0]?.message?.content ?? "{}";
      return normalisiereErgebnis(JSON.parse(text));
    },
  };
}

export function getKiProvider(): KiProvider | null {
  switch (process.env.KI_PROVIDER) {
    case "mock":
      return mockProvider;
    case "openai-compatible":
      return openAiCompatibleProvider();
    default:
      return null;
  }
}
