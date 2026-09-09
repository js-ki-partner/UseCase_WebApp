import { NextResponse, type NextRequest } from "next/server";

// Grober Vorfilter für den Adminbereich (Konzept Abschnitt 5): ohne Session-Cookie
// gar nicht erst rendern. Die echte Prüfung (Signatur, TOTP-Status) macht das
// Dashboard-Layout serverseitig. In Next 16 heißt diese Datei `proxy` (früher `middleware`).
const OEFFENTLICHE_ADMIN_PFADE = ["/admin/login", "/admin/setup-2fa"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const istGeschuetzt =
    (pathname === "/admin" || pathname.startsWith("/admin/")) &&
    !OEFFENTLICHE_ADMIN_PFADE.some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    );

  if (!istGeschuetzt) return NextResponse.next();

  const hatSession = req.cookies.has("ucradar_admin");
  if (!hatSession) {
    const ziel = new URL("/admin/login", req.nextUrl.origin);
    return NextResponse.redirect(ziel);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
