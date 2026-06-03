import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { shouldRun } from "@/lib/app-settings";
import { syncSchedule } from "@/lib/sync-service";
import { syncTopScorers, syncMatchGoals } from "@/lib/stats-service";
import { rescoreAll, rescoreTournamentBets } from "@/lib/scoring-service";
import { hasApiFootball } from "@/lib/api-football";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Drossel-Intervalle: Spielplan günstig (OpenFootball) -> häufiger;
// API-Football (Free-Tier-Limit) -> seltener.
const SCHEDULE_MS = 15 * 60 * 1000; // 15 Min
const STATS_MS = 60 * 60 * 1000; // 60 Min

/**
 * Nutzungsgesteuerter Auto-Sync (Ersatz für Cron auf dem Hobby-Plan):
 * Wird vom Browser eingeloggter Nutzer im Hintergrund aufgerufen. Dank Throttle
 * läuft echter Sync höchstens alle 15/60 Min – egal wie viele Aufrufe kommen.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const did: string[] = [];

  if (await shouldRun("lastScheduleSync", SCHEDULE_MS)) {
    await syncSchedule();
    await rescoreAll();
    did.push("schedule");
  }

  if (hasApiFootball() && (await shouldRun("lastStatsSync", STATS_MS))) {
    await syncTopScorers();
    await syncMatchGoals();
    await rescoreTournamentBets();
    did.push("stats");
  }

  return NextResponse.json({ ok: true, did });
}
