import { NextResponse, type NextRequest } from "next/server";
import { establishKontaktZugang } from "@/lib/kontakt";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Zugang für den Ansprechpartner beim Kunden (Konzept Abschnitt 3).
 * Tauscht das Token gegen die Kontakt-Session und leitet aufs Dashboard.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const res = await establishKontaktZugang(token);
  // Absolute URL aus APP_BASE_URL: hinter dem Reverse Proxy ist
  // req.nextUrl.origin der interne Container-Host (localhost:3000).
  const base = env.appBaseUrl();
  if (!res) {
    return NextResponse.redirect(new URL("/k/ungueltig", base));
  }
  return NextResponse.redirect(new URL(`/${res.slug}/dashboard`, base));
}
