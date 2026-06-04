import { NextResponse } from "next/server";
import { runScheduledSync } from "@/lib/auto-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Externer Cron-Endpunkt (z. B. cron-job.org jede Minute).
 *   Nutzt dieselbe gedrosselte Logik wie der Auto-Sync: echte API-Aufrufe nur
 *   alle 60s (Live) bzw. 15min (sonst) – so ist ein Minuten-Ping unbedenklich.
 *
 * Absicherung: erfordert CRON_SECRET. Aufruf mit
 *   - Header "Authorization: Bearer <CRON_SECRET>" (so ruft Vercel Cron auf), oder
 *   - Query "?secret=<CRON_SECRET>".
 * Ohne gesetztes CRON_SECRET ist der Endpunkt gesperrt (sicher per Default).
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const q = new URL(req.url).searchParams.get("secret");
  return auth === `Bearer ${secret}` || q === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { did, live } = await runScheduledSync();
  return NextResponse.json({ ok: true, did, live, at: new Date().toISOString() });
}
