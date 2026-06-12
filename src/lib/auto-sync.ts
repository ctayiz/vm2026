// Gedrosselte Sync-Logik für /api/sync/auto (Browser) und /api/cron/sync (Cron).
// EINZIGE Datenquelle: API-Football. Egal wie oft aufgerufen wird – echte
// API-Abrufe passieren nur im erlaubten Intervall.

import { db } from "./db";
import { shouldRun } from "./app-settings";
import { syncTopScorers, syncMatchGoals } from "./stats-service";
import { syncApiFootball } from "./live-score-service";
import { rescoreAll, rescoreTournamentBets } from "./scoring-service";
import { hasApiFootball } from "./api-football";

const SYNC_INPLAY_MS = 2 * 60 * 1000; // Spiel LÄUFT: alle 2 Min
const SYNC_LIVE_MS = 5 * 60 * 1000; // Anpfiff nahe (< 2,5h): alle 5 Min
const SYNC_IDLE_MS = 30 * 60 * 1000; // sonst: alle 30 Min (K.o.-Paarungen/Stadien nachziehen)
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
  const did: string[] = [];
  if (!hasApiFootball()) return { did, live: false };

  const inPlay = (await db.match.count({ where: { status: "live" } })) > 0;
  const live = inPlay || (await isLiveWindow());

  // Haupt-Sync: Stand, Status, Sieger, K.o.-Paarungen, Stadien.
  const interval = inPlay ? SYNC_INPLAY_MS : live ? SYNC_LIVE_MS : SYNC_IDLE_MS;
  if (await shouldRun("lastApiSync", interval)) {
    try {
      const r = await syncApiFootball();
      if (r.updated > 0 || r.resolved > 0) await rescoreAll(); // beendete Spiele sofort werten
      did.push("sync");
    } catch {
      /* API-Fehler/Limit: ignorieren, nächster Lauf versucht es erneut */
    }
  }

  // Torschützen + Tor-Events (für Statistik/Bonus), seltener.
  if (await shouldRun("lastStatsSync", STATS_MS)) {
    try {
      await syncTopScorers();
      await syncMatchGoals();
      await rescoreTournamentBets();
      did.push("stats");
    } catch {
      /* ignorieren */
    }
  }

  return { did, live };
}
