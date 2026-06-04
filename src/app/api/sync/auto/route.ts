import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { shouldRun } from "@/lib/app-settings";
import { syncSchedule } from "@/lib/sync-service";
import { syncTopScorers, syncMatchGoals } from "@/lib/stats-service";
import { rescoreAll, rescoreTournamentBets } from "@/lib/scoring-service";
import { hasApiFootball } from "@/lib/api-football";
import { hasFootballData } from "@/lib/football-data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Drossel-Intervalle.
const SCHEDULE_MS = 15 * 60 * 1000; // normal: 15 Min
const SCHEDULE_LIVE_MS = 60 * 1000; // Live-Modus: 60 Sek (bleibt unter 10/min)
const STATS_MS = 60 * 60 * 1000; // Torschützen: 60 Min

/**
 * Erkennt, ob aktuell ein Spiel läuft: Status "live" ODER Anstoß in den letzten
 * ~2,5 h und noch nicht beendet (deckt Lag/fehlende Status-Updates ab).
 */
async function isLiveWindow(): Promise<boolean> {
  const now = Date.now();
  const live = await db.match.count({ where: { status: "live" } });
  if (live > 0) return true;
  const recent = await db.match.count({
    where: {
      status: { not: "finished" },
      kickoff: { lte: new Date(now), gte: new Date(now - 2.5 * 60 * 60 * 1000) },
    },
  });
  return recent > 0;
}

/**
 * Nutzungsgesteuerter Auto-Sync (Ersatz für Cron auf dem Hobby-Plan).
 * Im Live-Fenster wird der Spielplan alle 60 Sek aktualisiert (sonst alle 15 Min);
 * der serverseitige Throttle verhindert dabei zu viele API-Aufrufe.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const live = await isLiveWindow();
  const did: string[] = [];

  if (await shouldRun("lastScheduleSync", live ? SCHEDULE_LIVE_MS : SCHEDULE_MS)) {
    await syncSchedule();
    await rescoreAll();
    did.push("schedule");
  }

  if ((hasFootballData() || hasApiFootball()) && (await shouldRun("lastStatsSync", STATS_MS))) {
    await syncTopScorers();
    if (hasApiFootball()) await syncMatchGoals(); // Tor-Events nur via API-Football
    await rescoreTournamentBets();
    did.push("stats");
  }

  // `live` signalisiert dem Client, häufiger zu pollen.
  return NextResponse.json({ ok: true, did, live });
}
