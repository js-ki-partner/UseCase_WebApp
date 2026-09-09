import { NextResponse, type NextRequest } from "next/server";
import { loeseMagicLink } from "@/lib/magic-link";
import { setTenantSession } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/** Magic-Link-Rueckkehr zum eigenen Entwurf (Konzept Abschnitt 5). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const treffer = await loeseMagicLink(token);
  if (!treffer) {
    return NextResponse.redirect(new URL("/r/ungueltig", req.nextUrl.origin));
  }
  await setTenantSession(treffer.tenantId, treffer.tenantSlug);
  return NextResponse.redirect(
    new URL(
      `/${treffer.tenantSlug}/bearbeiten/${treffer.useCaseId}`,
      req.nextUrl.origin,
    ),
  );
}
