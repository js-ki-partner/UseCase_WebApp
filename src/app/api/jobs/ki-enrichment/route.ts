import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { verarbeiteWartende } from "@/lib/ki-enrichment";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Arbeitet wartende KI-Anreicherungs-Aufträge ab (Konzept 4.6). Für einen Cron:
 *   curl -fsS -H "Authorization: Bearer $JOB_TOKEN" \
 *     https://ideen.ki-partner.tech/api/jobs/ki-enrichment
 */
async function run(req: NextRequest) {
  const token = env.jobToken();
  if (!token) {
    return NextResponse.json({ error: "Job deaktiviert (JOB_TOKEN fehlt)." }, { status: 503 });
  }
  const angeboten = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(angeboten);
  const b = Buffer.from(token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const ergebnis = await verarbeiteWartende();
  return NextResponse.json({ ok: true, ...ergebnis });
}

export const GET = run;
export const POST = run;
