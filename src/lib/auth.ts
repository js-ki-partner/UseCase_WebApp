import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { prisma } from "./prisma";
import { getAdminSession } from "./session";

authenticator.options = { window: 1 };

export function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}

export function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function totpAuthUri(email: string, secret: string): string {
  return authenticator.keyuri(email, "UC-Radar Admin", secret);
}

export function verifyTotp(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token: token.replace(/\s/g, ""), secret });
  } catch {
    return false;
  }
}

/** Liefert den angemeldeten Admin oder null. */
export async function currentAdmin() {
  const session = await getAdminSession();
  if (!session.adminUserId) return null;
  const admin = await prisma.adminUser.findUnique({
    where: { id: session.adminUserId },
  });
  return admin ?? null;
}

export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) {
    throw new Error("UNAUTHORIZED");
  }
  return admin;
}
