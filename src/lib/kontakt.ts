import { notFound } from "next/navigation";
import { prisma } from "./prisma";
import { getKontaktSession } from "./session";
import { verifyToken } from "./tokens";
import type { TenantContext } from "./tenant";

export interface KontaktContext {
  kontaktId: string;
  name: string;
  tenant: TenantContext;
}

function toTenantContext(t: {
  id: string;
  slug: string;
  name: string;
  brandingLogoUrl: string | null;
  brandingAccentColor: string | null;
  stundensatzDefault: number;
  zeigtBewertung: boolean;
  kiAktiviert: boolean;
}): TenantContext {
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
 * Löst ein Ansprechpartner-Zugangstoken auf und setzt die Kontakt-Session.
 * Nur aus einem Route Handler aufrufen (Cookie-Schreibzugriff).
 */
export async function establishKontaktZugang(
  token: string,
): Promise<{ slug: string } | null> {
  // Kandidaten mit Ablauf in der Zukunft; Token-Hash prüfen wir per HMAC-Vergleich.
  const kontakte = await prisma.tenantKontakt.findMany({
    where: {
      zugangTokenHash: { not: null },
      OR: [{ tokenExpiresAt: null }, { tokenExpiresAt: { gt: new Date() } }],
    },
    include: { tenant: true },
  });

  const treffer = kontakte.find(
    (k) => k.zugangTokenHash && verifyToken(token, k.zugangTokenHash),
  );
  if (!treffer) return null;

  const session = await getKontaktSession();
  session.kontaktId = treffer.id;
  session.tenantId = treffer.tenantId;
  session.slug = treffer.tenant.slug;
  await session.save();

  await prisma.tenantKontakt.update({
    where: { id: treffer.id },
    data: { letzterLoginAm: new Date() },
  });

  return { slug: treffer.tenant.slug };
}

/** Liest den Ansprechpartner-Kontext aus der Session (für Server Components). */
export async function resolveKontakt(
  slug: string,
): Promise<KontaktContext | null> {
  const session = await getKontaktSession();
  if (!session.kontaktId || session.slug !== slug) return null;

  const kontakt = await prisma.tenantKontakt.findUnique({
    where: { id: session.kontaktId },
    include: { tenant: true },
  });
  if (!kontakt || kontakt.tenant.slug !== slug) return null;
  if (!kontakt.zugangTokenHash) return null; // Zugang widerrufen

  return {
    kontaktId: kontakt.id,
    name: kontakt.name,
    tenant: toTenantContext(kontakt.tenant),
  };
}

export async function requireKontakt(slug: string): Promise<KontaktContext> {
  const ctx = await resolveKontakt(slug);
  if (!ctx) notFound();
  return ctx;
}
