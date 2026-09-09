import { NextResponse, type NextRequest } from "next/server";
import { establishKontaktZugang } from "@/lib/kontakt";

export const dynamic = "force-dynamic";

/**
 * Zugang für den Ansprechpartner beim Kunden (Konzept Abschnitt 3).
 * Tauscht das Token gegen die Kontakt-Session und leitet aufs Dashboard.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const res = await establishKontaktZugang(token);
  if (!res) {
    return NextResponse.redirect(new URL("/k/ungueltig", req.nextUrl.origin));
  }
  return NextResponse.redirect(
    new URL(`/${res.slug}/dashboard`, req.nextUrl.origin),
  );
}
