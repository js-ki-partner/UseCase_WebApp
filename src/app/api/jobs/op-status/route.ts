import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { aktualisiereAlleFortschritte } from "@/lib/op-status";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Liest den Fortschritt aller übertragenen Use Cases aus OpenProject zurück
 * (Konzept 4.7/7). Für einen Cron-Job gedacht:
 *
 *   curl -fsS -H "Authorization: Bearer $JOB_TOKEN" \
 *     https://ideen.ki-partner.tech/api/jobs/op-status
 *
 * Ohne gesetztes JOB_TOKEN ist der Endpunkt deaktiviert.
 */
async function run(req: NextRequest) {
  const token = env.jobToken();
  if (!token) {
    return NextResponse.json({ error: "Job deaktiviert (JOB_TOKEN fehlt)." }, { status: 503 });
  }
  const auth = req.headers.get("authorization") ?? "";
  const angeboten = auth.replace(/^Bearer\s+/i, "");
  const a = Buffer.from(angeboten);
  const b = Buffer.from(token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const lauf = await aktualisiereAlleFortschritte();
  return NextResponse.json({ ok: true, ...lauf });
}

export const GET = run;
export const POST = run;
