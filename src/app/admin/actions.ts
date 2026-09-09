"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { verifyPassword, verifyTotp } from "@/lib/auth";
import { adminLoginSchema, adminTotpSchema } from "@/lib/validation";
import { audit, clientIp } from "@/lib/audit";
import { bereinigeRateLimitStore, rateLimit } from "@/lib/rate-limit";

export interface AuthState {
  fehler?: string;
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = adminLoginSchema.safeParse({
    email: formData.get("email"),
    passwort: formData.get("passwort"),
  });
  if (!parsed.success) return { fehler: "Bitte E-Mail und Passwort angeben." };

  bereinigeRateLimitStore();
  const ip = (await clientIp()) ?? "unbekannt";
  const rl = rateLimit(`admin-login:${ip}`, 8, 600);
  if (!rl.ok) {
    return { fehler: "Zu viele Anmeldeversuche. Bitte einige Minuten warten." };
  }

  const admin = await prisma.adminUser.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  const ok = admin
    ? await verifyPassword(parsed.data.passwort, admin.passwortHash)
    : false;
  if (!admin || !ok) {
    await audit({
      actor: "system",
      aktion: "admin.login_fehlgeschlagen",
      detail: { email: parsed.data.email.toLowerCase() },
    });
    return { fehler: "E-Mail oder Passwort ist falsch." };
  }

  const session = await getAdminSession();
  session.adminUserId = undefined;
  session.pendingAdminUserId = admin.id;
  await session.save();

  redirect(admin.totpAktiv ? "/admin/login/totp" : "/admin/setup-2fa");
}

export async function pruefeTotp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const session = await getAdminSession();
  if (!session.pendingAdminUserId) redirect("/admin/login");

  const parsed = adminTotpSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { fehler: "Bitte den 6-stelligen Code eingeben." };

  const admin = await prisma.adminUser.findUnique({
    where: { id: session.pendingAdminUserId },
  });
  if (!admin || !admin.totpSecret || !verifyTotp(parsed.data.code, admin.totpSecret)) {
    return { fehler: "Der Code stimmt nicht. Bitte erneut versuchen." };
  }

  session.adminUserId = admin.id;
  session.pendingAdminUserId = undefined;
  await session.save();
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });
  await audit({
    actor: `admin:${admin.id}`,
    aktion: "admin.login",
  });
  redirect("/admin");
}

export async function bestaetigeTotpEinrichtung(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const session = await getAdminSession();
  if (!session.pendingAdminUserId) redirect("/admin/login");

  const parsed = adminTotpSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { fehler: "Bitte den 6-stelligen Code eingeben." };

  const admin = await prisma.adminUser.findUnique({
    where: { id: session.pendingAdminUserId },
  });
  if (!admin || !admin.totpSecret || !verifyTotp(parsed.data.code, admin.totpSecret)) {
    return { fehler: "Der Code stimmt nicht. Bitte die App-Zeit prüfen und erneut versuchen." };
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { totpAktiv: true, lastLoginAt: new Date() },
  });
  session.adminUserId = admin.id;
  session.pendingAdminUserId = undefined;
  await session.save();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  const session = await getAdminSession();
  session.destroy();
  redirect("/admin/login");
}
