// Gemeinsame, gedrosselte Sync-Logik für /api/sync/auto (Browser) und
// /api/cron/sync (externer Cron). Egal wie oft aufgerufen wird: echte
// API-Aufrufe passieren nur im erlaubten Intervall (Live: 60s, sonst 15min).

import { db } from "./db";
import { shouldRun } from "./app-settings";
import { syncSchedule } from "./sync-service";
import { syncTopScorers, syncMatchGoals } from "./stats-service";
import { syncLiveScores } from "./live-score-service";
import { rescoreAll, rescoreTournamentBets } from "./scoring-service";
import { hasApiFootball } from "./api-football";
import { hasFootballData } from "./football-data";

const SCHEDULE_MS = 15 * 60 * 1000; // normal: 15 Min
const SCHEDULE_LIVE_MS = 60 * 1000; // Live-Fenster: 60 Sek
const LIVE_SCORE_MS = 5 * 60 * 1000; // Live-Stände (API-Football): alle 5 Min – schont das Gratis-Kontingent (100/Tag)
const META_MS = 6 * 60 * 60 * 1000; // außerhalb Live: alle 6 Std (füllt Stadien/Stadt nach)
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

  // API-Football: im Live-Fenster alle 5 Min (echte Live-Stände), sonst alle 6 Std
  // (füllt nur Stadien/Stadt nach). Läuft NACH syncSchedule -> letztes Wort bei Stand/Status.
  if (hasApiFootball() && (await shouldRun("lastLiveScoreSync", live ? LIVE_SCORE_MS : META_MS))) {
    const r = await syncLiveScores();
    if (r.updated > 0) await rescoreAll(); // beendete Spiele sofort werten
    did.push(live ? "livescores" : "meta");
  }

  if ((hasFootballData() || hasApiFootball()) && (await shouldRun("lastStatsSync", STATS_MS))) {
    await syncTopScorers();
    if (hasApiFootball()) await syncMatchGoals(); // Tor-Events nur via API-Football
    await rescoreTournamentBets();
    did.push("stats");
  }

  return { did, live };
}
