import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getAdminSession } from "./session";
import { generateTotpSecret, totpAuthUri } from "./auth";

export interface TotpEinrichtung {
  secret: string;
  otpauthUri: string;
}

/**
 * Stellt fuer den Admin im pending-Zustand ein TOTP-Secret bereit (erzeugt es
 * beim ersten Aufruf) und liefert Secret + otpauth-URI zur Anzeige.
 *
 * Bewusst kein "use server" — wird aus dem Server Component der Einrichtungsseite
 * aufgerufen. Die Erzeugung ist idempotent, solange die 2FA noch nicht aktiv ist.
 */
export async function ladeOderErzeugeTotpEinrichtung(): Promise<TotpEinrichtung> {
  const session = await getAdminSession();
  if (!session.pendingAdminUserId) redirect("/admin/login");
  const admin = await prisma.adminUser.findUnique({
    where: { id: session.pendingAdminUserId },
  });
  if (!admin) redirect("/admin/login");

  let secret = admin.totpSecret;
  if (!secret || admin.totpAktiv) {
    secret = generateTotpSecret();
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { totpSecret: secret, totpAktiv: false },
    });
  }
  return { secret, otpauthUri: totpAuthUri(admin.email, secret) };
}
