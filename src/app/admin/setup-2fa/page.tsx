import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getAdminSession } from "@/lib/session";
import { ladeOderErzeugeTotpEinrichtung } from "@/lib/totp-setup";
import { CodeForm } from "../CodeForm";
import { bestaetigeTotpEinrichtung } from "../actions";

export const dynamic = "force-dynamic";

export default async function Setup2faPage() {
  const session = await getAdminSession();
  if (session.adminUserId) redirect("/admin");
  if (!session.pendingAdminUserId) redirect("/admin/login");

  const { secret, otpauthUri } = await ladeOderErzeugeTotpEinrichtung();
  const qrDataUrl = await QRCode.toDataURL(otpauthUri, { margin: 1, width: 220 });

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <h1 className="text-xl font-semibold">Zwei-Faktor-Authentifizierung einrichten</h1>
      <p className="mt-1 mb-4 text-sm text-gray-600">
        Scannen Sie den Code mit einer Authenticator-App (z. B. Aegis, 1Password,
        Google Authenticator) und bestätigen Sie mit dem ersten generierten Code.
      </p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrDataUrl}
        alt="QR-Code für die Authenticator-App"
        className="mb-3 self-start rounded-md border border-gray-200 bg-white p-2"
        width={220}
        height={220}
      />
      <p className="mb-6 text-xs text-gray-500">
        Manuelle Eingabe: <code className="font-mono">{secret}</code>
      </p>

      <CodeForm action={bestaetigeTotpEinrichtung} label="Einrichtung abschließen" />
    </main>
  );
}
