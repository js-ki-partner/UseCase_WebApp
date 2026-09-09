import { redirect } from "next/navigation";
import { requireTenant } from "@/lib/tenant";
import { EinreicherChrome } from "@/components/EinreicherChrome";
import { KurzerfassungForm } from "./KurzerfassungForm";
import { submitKurzerfassung, type FormState } from "./actions";

export const dynamic = "force-dynamic";

export default async function TenantPage({
  params,
  searchParams,
}: PageProps<"/[tenant]">) {
  const { tenant: slug } = await params;
  const sp = await searchParams;
  // Token gegen die Session tauschen (Cookie-Schreibzugriff nur im Route Handler).
  if (typeof sp.t === "string" && sp.t) {
    redirect(`/api/access/${slug}?t=${encodeURIComponent(sp.t)}`);
  }
  const ctx = await requireTenant(slug);

  const action = submitKurzerfassung.bind(null, slug) as (
    prev: FormState,
    fd: FormData,
  ) => Promise<FormState>;

  return (
    <EinreicherChrome tenant={ctx}>
      <header className="mb-8">
        <p className="text-sm text-gray-500">Use-Case-Erfassung für {ctx.name}</p>
        <h1 className="mt-1 text-2xl font-semibold">Use Case einreichen</h1>
        <p className="mt-2 text-gray-700">
          Kurzerfassung in unter drei Minuten. Kein Konto nötig. Sie können den
          Eintrag später ergänzen.
        </p>
      </header>

      <KurzerfassungForm action={action} modus="neu" />
    </EinreicherChrome>
  );
}
