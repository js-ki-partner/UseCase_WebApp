import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/admin">) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/admin" className="font-semibold">
              UC-Radar
            </Link>
            <Link href="/admin" className="text-gray-600 hover:text-black">
              Eingangskorb
            </Link>
            <Link href="/admin/tenants" className="text-gray-600 hover:text-black">
              Kunden
            </Link>
            <Link href="/admin/prio" className="text-gray-600 hover:text-black">
              Priorisierung
            </Link>
            <Link href="/admin/audit" className="text-gray-600 hover:text-black">
              Audit
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>{admin.name}</span>
            <form action={logout}>
              <button className="underline">Abmelden</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
