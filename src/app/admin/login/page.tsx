import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await currentAdmin()) redirect("/admin");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-xl font-semibold">Adminbereich — Anmeldung</h1>
      <p className="mt-1 mb-6 text-sm text-gray-600">
        Zugang nur für KI&nbsp;Partner. Zweiter Faktor erforderlich.
      </p>
      <LoginForm />
    </main>
  );
}
