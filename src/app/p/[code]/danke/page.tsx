import { prisma } from "@/lib/prisma";
import { KiPartnerLogo } from "@/components/KiPartnerLogo";

export const dynamic = "force-dynamic";

export default async function PrioDankePage({ params }: PageProps<"/p/[code]/danke">) {
  const { code } = await params;
  const runde = await prisma.prioRunde.findUnique({
    where: { zugangsCode: code },
    select: { titel: true, tenant: { select: { name: true } } },
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Danke für Ihre Einschätzung</h1>
      <p className="mt-4 text-gray-700">
        Ihre Budgetverteilung
        {runde ? ` für „${runde.titel}"` : ""} wurde gespeichert. Das Ergebnis
        wird im Workshop gemeinsam angesehen.
      </p>
      <p className="mt-8 flex items-center gap-2 text-xs text-gray-500">
        bereitgestellt von <KiPartnerLogo className="h-5 w-auto text-gray-700" />
      </p>
    </main>
  );
}
