import { type NextRequest } from "next/server";
import { currentAdmin } from "@/lib/auth";
import { bauePortfolioCsv } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

/** CSV-Export der Portfolioübersicht (Konzept Abschnitt 10). Nur für Admins. */
export async function GET(req: NextRequest) {
  if (!(await currentAdmin())) {
    return new Response("Nicht autorisiert.", { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const tenantSlug = req.nextUrl.searchParams.get("tenant") ?? undefined;

  const csv = await bauePortfolioCsv({ status, tenantSlug });
  const datum = new Date().toISOString().slice(0, 10);
  const name =
    tenantSlug && tenantSlug.length > 0
      ? `uc-portfolio-${tenantSlug}-${datum}.csv`
      : `uc-portfolio-${datum}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
