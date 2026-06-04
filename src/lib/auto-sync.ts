// Gemeinsame, gedrosselte Sync-Logik für /api/sync/auto (Browser) und
// /api/cron/sync (externer Cron). Egal wie oft aufgerufen wird: echte
// API-Aufrufe passieren nur im erlaubten Intervall (Live: 60s, sonst 15min).

import { db } from "./db";
import { shouldRun } from "./app-settings";
import { syncSchedule } from "./sync-service";
import { syncTopScorers, syncMatchGoals } from "./stats-service";
import { rescoreAll, rescoreTournamentBets } from "./scoring-service";
import { hasApiFootball } from "./api-football";
import { hasFootballData } from "./football-data";

const SCHEDULE_MS = 15 * 60 * 1000; // normal: 15 Min
const SCHEDULE_LIVE_MS = 60 * 1000; // Live-Fenster: 60 Sek
const STATS_MS = 60 * 60 * 1000; // Torschützen: 60 Min

/** Läuft gerade ein Spiel? (Status "live" oder Anpfiff < 2,5h, nicht beendet) */
export async function isLiveWindow(): Promise<boolean> {
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

/** Führt den gedrosselten Sync aus. Gibt zurück, was lief + ob Live-Fenster. */
export async function runScheduledSync(): Promise<{ did: string[]; live: boolean }> {
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

  return { did, live };
}
