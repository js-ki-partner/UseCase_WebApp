import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { CodeForm } from "../../CodeForm";
import { pruefeTotp } from "../../actions";

export const dynamic = "force-dynamic";

export default async function TotpPage() {
  const session = await getAdminSession();
  if (session.adminUserId) redirect("/admin");
  if (!session.pendingAdminUserId) redirect("/admin/login");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-xl font-semibold">Bestätigung mit zweitem Faktor</h1>
      <p className="mt-1 mb-6 text-sm text-gray-600">
        Bitte den aktuellen 6-stelligen Code aus Ihrer Authenticator-App eingeben.
      </p>
      <CodeForm action={pruefeTotp} label="Anmelden" />
    </main>
  );
}
