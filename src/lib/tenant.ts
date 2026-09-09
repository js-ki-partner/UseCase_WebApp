import { notFound } from "next/navigation";
import { prisma } from "./prisma";
import { getTenantSession } from "./session";
import { verifyToken } from "./tokens";

export interface TenantContext {
  id: string;
  slug: string;
  name: string;
  brandingLogoUrl: string | null;
  brandingAccentColor: string | null;
  stundensatzDefault: number;
  zeigtBewertung: boolean;
  kiAktiviert: boolean;
}

type TenantRow = {
  id: string;
  slug: string;
  name: string;
  brandingLogoUrl: string | null;
  brandingAccentColor: string | null;
  stundensatzDefault: number;
  zeigtBewertung: boolean;
  kiAktiviert: boolean;
};

function toContext(t: TenantRow): TenantContext {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    brandingLogoUrl: t.brandingLogoUrl,
    brandingAccentColor: t.brandingAccentColor,
    stundensatzDefault: t.stundensatzDefault,
    zeigtBewertung: t.zeigtBewertung,
    kiAktiviert: t.kiAktiviert,
  };
}

/**
 * Prueft ein Zugangstoken gegen den Tenant und setzt bei Erfolg die
 * Tenant-Session. Nur aus einem Route Handler / einer Server Action aufrufen
 * (Cookie-Schreibzugriff).
 */
export async function establishTenantAccess(
  slug: string,
  token: string,
): Promise<TenantContext | null> {
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || !tenant.accessTokenHash) return null;
  if (!verifyToken(token, tenant.accessTokenHash)) return null;
  if (tenant.tokenExpiresAt && tenant.tokenExpiresAt.getTime() < Date.now()) {
    return null;
  }

  const session = await getTenantSession();
  session.tenantId = tenant.id;
  session.slug = tenant.slug;
  await session.save();
  return toContext(tenant);
}

/** Setzt die Tenant-Session direkt (z. B. nach Magic-Link-Aufloesung). */
export async function setTenantSession(tenantId: string, slug: string): Promise<void> {
  const session = await getTenantSession();
  session.tenantId = tenantId;
  session.slug = slug;
  await session.save();
}

/**
 * Loest den Tenant fuer eine Einreicher-Seite aus der bestehenden Session auf.
 * Kein Cookie-Schreibzugriff — fuer Server Components geeignet.
 */
export async function resolveTenant(slug: string): Promise<TenantContext | null> {
  const session = await getTenantSession();
  if (session.slug !== slug || !session.tenantId) return null;

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || tenant.id !== session.tenantId) return null;
  return toContext(tenant);
}

/** Wie resolveTenant, ruft aber notFound() statt null zu liefern. */
export async function requireTenant(slug: string): Promise<TenantContext> {
  const ctx = await resolveTenant(slug);
  if (!ctx) notFound();
  return ctx;
}
