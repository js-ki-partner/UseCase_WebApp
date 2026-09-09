import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { EinreicherChrome } from "@/components/EinreicherChrome";
import { formatiereStundenpotenzial } from "@/lib/potential";

export const dynamic = "force-dynamic";

export default async function DankePage({
  params,
  searchParams,
}: PageProps<"/[tenant]/danke">) {
  const { tenant: slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenant(slug);
  const stunden = Number(sp.h);
  const ergaenzt = sp.ergaenzt === "1";
  const prozessGespeichert = typeof sp.prozess === "string";
  const ucId = typeof sp.uc === "string" ? sp.uc : null;

  // Use Case laden, um den Prozessschritt-Stand zu zeigen (nur eigener Tenant)
  const useCase = ucId
    ? await prisma.useCase.findFirst({
        where: { id: ucId, tenantId: ctx.id },
        include: { _count: { select: { processSteps: true } } },
      })
    : null;
  const hatSchritte = (useCase?._count.processSteps ?? 0) > 0;

  return (
    <EinreicherChrome tenant={ctx}>
      <h1 className="text-2xl font-semibold">
        {prozessGespeichert
          ? "Prozessschritte gespeichert"
          : ergaenzt
            ? "Änderungen gespeichert"
            : "Vielen Dank für Ihre Einreichung"}
      </h1>

      {Number.isFinite(stunden) && stunden > 0 && (
        <p className="mt-4 text-lg">
          Geschätztes Potenzial: {formatiereStundenpotenzial(stunden)}.
        </p>
      )}

      <p className="mt-4 text-gray-700">
        {ctx.name} sichtet die Einreichungen und meldet sich bei Rückfragen. Wenn
        Sie eine E-Mail-Adresse angegeben haben, haben wir Ihnen einen Link
        geschickt, mit dem Sie den Eintrag später ergänzen können.
      </p>

      {useCase && (
        <div className="mt-8 rounded-md border border-gray-200 bg-white p-4">
          <h2 className="font-medium">
            {hatSchritte
              ? "Mehr Details erfassen"
              : "Möchten Sie noch die Prozessschritte erfassen?"}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {hatSchritte
              ? `${useCase._count.processSteps} Schritt(e) erfasst. Sie können sie jederzeit anpassen.`
              : "10–20 Minuten. Zeigt, wo Wartezeit entsteht und wo Menschen entscheiden — das ist für die spätere Bewertung besonders wertvoll."}
          </p>
          <Link
            href={`/${slug}/prozess/${useCase.id}`}
            className="accent-text mt-2 inline-block text-sm underline"
          >
            {hatSchritte ? "Prozessschritte bearbeiten" : "Prozessschritte erfassen"} →
          </Link>
        </div>
      )}

      <div className="mt-8 flex gap-4">
        <Link
          href={`/${slug}`}
          className="accent-bg rounded-md px-5 py-2.5 font-medium text-white"
        >
          Weiteren Use Case einreichen
        </Link>
      </div>
    </EinreicherChrome>
  );
}
