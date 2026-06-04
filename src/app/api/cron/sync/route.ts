import { NextResponse } from "next/server";
import { syncSchedule } from "@/lib/sync-service";
import { syncTopScorers, syncMatchGoals } from "@/lib/stats-service";
import { rescoreAll } from "@/lib/scoring-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Automatischer Sync-Endpunkt (für Cron):
 *   Spielplan + Ergebnisse + Torschützen laden, dann alles neu auswerten.
 *
 * Absicherung: erfordert CRON_SECRET. Aufruf mit
 *   - Header "Authorization: Bearer <CRON_SECRET>" (so ruft Vercel Cron auf), oder
 *   - Query "?secret=<CRON_SECRET>".
 * Ist kein CRON_SECRET gesetzt, ist der Endpunkt gesperrt (sicher per Default).
 * Der reguläre Auto-Sync läuft ohnehin über /api/sync/auto (nur eingeloggt).
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Sicher per Default: ohne gesetztes CRON_SECRET ist der Endpunkt gesperrt.
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const q = new URL(req.url).searchParams.get("secret");
  return auth === `Bearer ${secret}` || q === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const schedule = await syncSchedule();
  const scorers = await syncTopScorers();
  const goals = await syncMatchGoals();
  const scoring = await rescoreAll();

  return NextResponse.json({
    ok: true,
    startedAt,
    schedule: { source: schedule.source, created: schedule.created, updated: schedule.updated },
    scorers: { ok: scorers.ok, message: scorers.message },
    goals: { ok: goals.ok, message: goals.message },
    scoring,
  });
}
