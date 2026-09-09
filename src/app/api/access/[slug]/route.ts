import { NextResponse, type NextRequest } from "next/server";
import { establishTenantAccess } from "@/lib/tenant";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Tauscht ein Zugangstoken (?t=) gegen die Tenant-Session und leitet auf die
 * saubere URL /{slug} weiter, damit das Token nicht in der Adresszeile bleibt.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const token = req.nextUrl.searchParams.get("t");
  // Ziel-URL aus APP_BASE_URL bauen: hinter dem Reverse Proxy ist
  // req.nextUrl.origin der interne Container-Host (localhost:3000).
  const ziel = new URL(`/${slug}`, env.appBaseUrl());

  if (!token) {
    return NextResponse.redirect(ziel);
  }

  // Bei ungueltigem Token bleibt die Session leer; /{slug} zeigt dann die
  // neutrale "Zugang nicht moeglich"-Seite (not-found.tsx).
  await establishTenantAccess(slug, token);
  return NextResponse.redirect(ziel);
}
