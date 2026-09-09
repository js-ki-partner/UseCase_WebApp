import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  formatDatumZeit,
  frequenzLabel,
  reifegradLabel,
  statusLabel,
} from "@/lib/format";
import { berechnePotenzial, type Frequenz } from "@/lib/potential";
import { kundenFortschritt } from "@/lib/openproject";
import { berechneWertkorridor, type KoKriterien } from "@/lib/bewertung";
import { einwilligungsStatus } from "@/lib/openproject";
import { env } from "@/lib/env";
import { EditForm } from "./EditForm";
import { OpenProjectAktionen } from "./OpenProjectAktionen";
import { DuplikatForm } from "./DuplikatForm";
import { BewertungForm } from "./BewertungForm";
import { KiAnreicherungPanel } from "./KiAnreicherungPanel";

export const dynamic = "force-dynamic";

export default async function UcDetailPage({ params }: PageProps<"/admin/uc/[id]">) {
  await requireAdmin();
  const { id } = await params;

  const uc = await prisma.useCase.findUnique({
    where: { id },
    include: {
      tenant: true,
      processSteps: { orderBy: { position: "asc" } },
      duplikatVon: true,
      duplikate: true,
      magicLinks: true,
      assessment: true,
      aiEnrichment: true,
    },
  });
  if (!uc) notFound();

  const wertVorschlag = berechneWertkorridor(
    uc.stundenpotenzialPa,
    uc.tenant.stundensatzDefault,
  );

  const potenzial = berechnePotenzial({
    frequenz: uc.frequenz as Frequenz,
    anzahlBetroffene: uc.anzahlBetroffene,
    dauerMinuten: uc.dauerMinuten,
  });

  const kandidaten = await prisma.useCase.findMany({
    where: { tenantId: uc.tenantId, id: { not: uc.id }, duplikatVonId: null },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Link href="/admin" className="text-sm text-gray-500 underline">
          ← Eingangskorb
        </Link>
        <h1 className="mt-2 text-xl font-semibold">
          {uc.titel || "Ohne Titel"}
        </h1>
        <p className="text-sm text-gray-500">
          {uc.tenant.name} · {reifegradLabel(uc.reifegrad)} ·{" "}
          {statusLabel(uc.status)}
        </p>

        {uc.duplikatVon && (
          <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
            Als Duplikat von{" "}
            <Link
              href={`/admin/uc/${uc.duplikatVon.id}`}
              className="underline"
            >
              {uc.duplikatVon.titel || uc.duplikatVon.problemText.slice(0, 40)}
            </Link>{" "}
            markiert.
          </p>
        )}

        <section className="mt-6">
          <h2 className="font-medium">Problem</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm">{uc.problemText}</p>
        </section>

        {uc.wunschergebnis && (
          <section className="mt-4">
            <h2 className="font-medium">Wunschergebnis</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm">{uc.wunschergebnis}</p>
          </section>
        )}

        <section className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Kachel k="Rolle / Abteilung" v={uc.rolle} />
          <Kachel k="Betroffene" v={String(uc.anzahlBetroffene)} />
          <Kachel k="Frequenz" v={frequenzLabel(uc.frequenz)} />
          <Kachel k="Dauer je Fall" v={`${uc.dauerMinuten} Min.`} />
          <Kachel
            k="Potenzial"
            v={`${uc.stundenpotenzialPa.toLocaleString("de-DE")} h/Jahr`}
          />
          {potenzial && (
            <Kachel
              k="Jahresfälle"
              v={potenzial.jahresfaelle.toLocaleString("de-DE")}
            />
          )}
        </section>

        {uc.processSteps.length > 0 && (
          <section className="mt-6">
            <h2 className="font-medium">Prozessschritte</h2>
            <div className="mt-2 overflow-x-auto rounded-md border border-gray-200">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-left">
                  <tr>
                    <th className="px-2 py-1">#</th>
                    <th className="px-2 py-1">Schritt</th>
                    <th className="px-2 py-1">Eingang → Ergebnis</th>
                    <th className="px-2 py-1">System</th>
                    <th className="px-2 py-1 text-right">Min.</th>
                    <th className="px-2 py-1">Marker</th>
                  </tr>
                </thead>
                <tbody>
                  {uc.processSteps.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-2 py-1 text-gray-500">{s.position}</td>
                      <td className="px-2 py-1">{s.bezeichnung}</td>
                      <td className="px-2 py-1 text-gray-600">
                        {[s.input, s.output].filter(Boolean).join(" → ") || "—"}
                      </td>
                      <td className="px-2 py-1">{s.system || "—"}</td>
                      <td className="px-2 py-1 text-right">{s.dauerMinuten ?? "—"}</td>
                      <td className="px-2 py-1">
                        {[
                          s.hatWartezeit ? "Wartezeit" : null,
                          s.brauchtEntscheidung ? "Entscheidung" : null,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {uc.aiEnrichment && (
          <section className="mt-8 rounded-md border border-gray-200 bg-white p-4">
            <h2 className="mb-3 font-medium">KI-Anreicherung</h2>
            <KiAnreicherungPanel
              useCaseId={uc.id}
              status={uc.aiEnrichment.status}
              fehler={uc.aiEnrichment.fehler}
              titelVorschlag={uc.aiEnrichment.titelVorschlag}
              kategorie={uc.aiEnrichment.kategorie}
              extrahierteSysteme={
                Array.isArray(uc.aiEnrichment.extrahierteSysteme)
                  ? (uc.aiEnrichment.extrahierteSysteme as string[])
                  : []
              }
              aehnliche={
                Array.isArray(uc.aiEnrichment.aehnlicheUseCases)
                  ? (uc.aiEnrichment.aehnlicheUseCases as {
                      useCaseId: string;
                      titel: string;
                      score: number;
                    }[])
                  : []
              }
              anbieter={uc.aiEnrichment.anbieter}
              modell={uc.aiEnrichment.modell}
              geprueft={uc.aiEnrichment.geprueft}
              einwilligung={einwilligungsStatus(uc)}
            />
          </section>
        )}

        <section className="mt-8 rounded-md border border-gray-200 bg-white p-4">
          <h2 className="mb-1 font-medium">Bewertung (nur KI Partner)</h2>
          <p className="mb-4 text-xs text-gray-500">
            Erst die vier K.-o.-Fragen, dann der Wertkorridor. Bei einem »nein«
            wandert der Use Case mit Begründung in die Warteliste.
          </p>
          <BewertungForm
            useCaseId={uc.id}
            vorschlag={wertVorschlag}
            werte={
              uc.assessment
                ? {
                    wertMin: uc.assessment.wertMin,
                    wertReal: uc.assessment.wertReal,
                    wertMax: uc.assessment.wertMax,
                    konfidenz: uc.assessment.konfidenz,
                    datenlage: uc.assessment.datenlage,
                    fehlerkosten: uc.assessment.fehlerkosten,
                    ownerBeimKunden: uc.assessment.ownerBeimKunden,
                    notizIntern: uc.assessment.notizIntern,
                    koKriterien:
                      (uc.assessment.koKriterien as KoKriterien | null) ?? null,
                    bewertetVon: uc.assessment.bewertetVon,
                  }
                : null
            }
          />
        </section>

        {uc.kundenkontext && (
          <section className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
            <h2 className="font-medium">Kontext vom Ansprechpartner</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm">{uc.kundenkontext}</p>
          </section>
        )}

        <section className="mt-8">
          <h2 className="font-medium">Einreicher</h2>
          <p className="mt-1 text-sm">
            {uc.istAnonym
              ? "Anonym eingereicht"
              : `${uc.einreicherName || "ohne Name"}${uc.einreicherEmail ? ` · ${uc.einreicherEmail}` : ""}`}
          </p>
          <p className="text-xs text-gray-500">
            Eingegangen {formatDatumZeit(uc.createdAt)}, zuletzt geändert{" "}
            {formatDatumZeit(uc.updatedAt)}
          </p>
        </section>
      </div>

      <aside className="space-y-6">
        <div className="rounded-md border border-gray-200 bg-white p-4">
          <h2 className="mb-3 font-medium">Bearbeiten</h2>
          <EditForm
            useCaseId={uc.id}
            titel={uc.titel ?? ""}
            status={uc.status}
            notizIntern={uc.notizIntern ?? ""}
          />
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-4">
          <h2 className="mb-2 font-medium">OpenProject</h2>
          {uc.openprojectWpId ? (
            <p className="mb-3 text-sm text-gray-600">
              {env.openproject().baseUrl ? (
                <a
                  href={`${env.openproject().baseUrl}/work_packages/${uc.openprojectWpId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="accent-text underline"
                >
                  Work Package #{uc.openprojectWpId}
                </a>
              ) : (
                <>Work Package #{uc.openprojectWpId}</>
              )}
              , zuletzt synchronisiert {formatDatumZeit(uc.syncedAt)}.
            </p>
          ) : (
            <p className="mb-3 text-sm text-gray-600">Noch nicht übertragen.</p>
          )}
          {uc.syncStatus === "FEHLER" && uc.syncFehler && (
            <p className="mb-3 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
              Letzter Fehler: {uc.syncFehler}
            </p>
          )}
          {uc.openprojectWpId && (
            <p className="mb-3 text-sm">
              Status in OpenProject:{" "}
              <span className="font-medium">
                {uc.openprojectStatusName ?? "noch nicht gelesen"}
              </span>
              {uc.openprojectStatusAt && (
                <span className="text-gray-500">
                  {" "}
                  (gelesen {formatDatumZeit(uc.openprojectStatusAt)})
                </span>
              )}
              {uc.openprojectStatusKey && (
                <span className="text-gray-500">
                  {` — Kunde sieht: „${kundenFortschritt(uc.openprojectStatusKey)}“`}
                </span>
              )}
            </p>
          )}
          <OpenProjectAktionen
            useCaseId={uc.id}
            bereitsUebertragen={Boolean(uc.openprojectWpId)}
          />
        </div>

        <div className="rounded-md border border-gray-200 bg-white p-4">
          <h2 className="mb-2 font-medium">Zusammenführen</h2>
          <DuplikatForm
            useCaseId={uc.id}
            istDuplikat={Boolean(uc.duplikatVonId)}
            kandidaten={kandidaten.map((k) => ({
              id: k.id,
              label: k.titel || k.problemText.slice(0, 50),
            }))}
          />
        </div>
      </aside>
    </div>
  );
}

function Kachel({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
      <p className="text-xs text-gray-500">{k}</p>
      <p className="font-medium">{v}</p>
    </div>
  );
}
