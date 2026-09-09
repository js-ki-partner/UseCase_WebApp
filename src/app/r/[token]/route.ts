import { NextResponse, type NextRequest } from "next/server";
import { loeseMagicLink } from "@/lib/magic-link";
import { setTenantSession } from "@/lib/tenant";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Magic-Link-Rueckkehr zum eigenen Entwurf (Konzept Abschnitt 5). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const treffer = await loeseMagicLink(token);
  // Absolute URL aus APP_BASE_URL: hinter dem Reverse Proxy ist
  // req.nextUrl.origin der interne Container-Host (localhost:3000).
  const base = env.appBaseUrl();
  if (!treffer) {
    return NextResponse.redirect(new URL("/r/ungueltig", base));
  }
  await setTenantSession(treffer.tenantId, treffer.tenantSlug);
  return NextResponse.redirect(
    new URL(`/${treffer.tenantSlug}/bearbeiten/${treffer.useCaseId}`, base),
  );
}
