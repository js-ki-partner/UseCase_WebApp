import { NextResponse, type NextRequest } from "next/server";
import { establishTenantAccess } from "@/lib/tenant";

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
  const ziel = new URL(`/${slug}`, req.nextUrl.origin);

  if (!token) {
    return NextResponse.redirect(ziel);
  }

  // Bei ungueltigem Token bleibt die Session leer; /{slug} zeigt dann die
  // neutrale "Zugang nicht moeglich"-Seite (not-found.tsx).
  await establishTenantAccess(slug, token);
  return NextResponse.redirect(ziel);
}
