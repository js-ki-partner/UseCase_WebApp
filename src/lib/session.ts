import type { SessionOptions } from "iron-session";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { env } from "./env";

// --- Adminbereich: echte Anmeldung mit zweitem Faktor (Konzept Abschnitt 5) ---
export interface AdminSession {
  adminUserId?: string;
  // Zwischenzustand: Passwort ok, TOTP steht noch aus
  pendingAdminUserId?: string;
}

const adminSessionOptions = (): SessionOptions => ({
  password: env.sessionSecret(),
  cookieName: "ucradar_admin",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  },
});

export async function getAdminSession() {
  return getIronSession<AdminSession>(await cookies(), adminSessionOptions());
}

// --- Einreicher: Token-Kontext, damit ?t=... nicht dauerhaft in der URL klebt ---
export interface TenantSession {
  tenantId?: string;
  slug?: string;
}

const tenantSessionOptions = (): SessionOptions => ({
  password: env.sessionSecret(),
  cookieName: "ucradar_tenant",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4,
  },
});

export async function getTenantSession() {
  return getIronSession<TenantSession>(await cookies(), tenantSessionOptions());
}

// --- Ansprechpartner beim Kunden (Konzept Abschnitt 3): persönlicher Zugang ---
export interface KontaktSession {
  kontaktId?: string;
  tenantId?: string;
  slug?: string;
}

const kontaktSessionOptions = (): SessionOptions => ({
  password: env.sessionSecret(),
  cookieName: "ucradar_kontakt",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  },
});

export async function getKontaktSession() {
  return getIronSession<KontaktSession>(await cookies(), kontaktSessionOptions());
}
