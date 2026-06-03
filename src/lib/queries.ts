import "server-only";
import { db } from "./db";
import { buildLeaderboard, type LeaderboardRow, type UserScoreInput } from "./ranking";
import { TOURNAMENT_QUESTIONS, getQuestion, type Prediction } from "./constants";
import { betStatus } from "./tournament";
import { pickLastAndNext } from "./favorites";

/** Leaderboard für alle (eingeloggten) Nutzer berechnen (inkl. Turnier-Bonus). */
export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const users = await db.user.findMany({
    where: { blocked: false },
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      createdAt: true,
      predictions: {
        select: { points: true, scored: true, match: { select: { kickoff: true } } },
      },
      tournamentBets: { select: { points: true } },
    },
  });

  const inputs: UserScoreInput[] = users.map((u) => {
    const scored = u.predictions.filter((p) => p.scored);
    const recentPoints = [...scored]
      .sort((a, b) => b.match.kickoff.getTime() - a.match.kickoff.getTime())
      .slice(0, 5)
      .map((p) => p.points ?? 0);

    const matchPoints = scored.reduce((s, p) => s + (p.points ?? 0), 0);
    const bonusPoints = u.tournamentBets.reduce((s, b) => s + (b.points ?? 0), 0);

    return {
      userId: u.id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      totalPoints: matchPoints + bonusPoints,
      bonusPoints,
      correctCount: scored.filter((p) => (p.points ?? 0) > 0).length,
      scoredCount: scored.length,
      predictedCount: u.predictions.length,
      recentPoints,
    };
  });

  return buildLeaderboard(inputs);
}

/** Ist das Turnier beendet? (Finale abgeschlossen bzw. ein Weltmeister gesetzt) */
export async function isTournamentFinished(): Promise<boolean> {
  const champion = await db.team.count({ where: { isChampion: true } });
  if (champion > 0) return true;
  const finalMatch = await db.match.findFirst({ where: { phase: "FINAL" } });
  return finalMatch?.status === "finished";
}

/** Tipp-Schluss für Turnier-Tipps = Anpfiff des ersten Spiels. */
export async function getTournamentLock(): Promise<{ lockTime: Date | null; locked: boolean }> {
  const first = await db.match.findFirst({ orderBy: { kickoff: "asc" }, select: { kickoff: true } });
  const lockTime = first?.kickoff ?? null;
  const locked = lockTime ? Date.now() >= lockTime.getTime() : false;
  return { lockTime, locked };
}

/** Alle Turnier-Fragen mit dem Tipp des Nutzers + Status. */
export async function getTournamentData(userId: string) {
  const [bets, teams, players, finished, lock] = await Promise.all([
    db.tournamentBet.findMany({ where: { userId }, include: { team: true, player: { include: { team: true } } } }),
    db.team.findMany({ orderBy: [{ group: "asc" }, { name: "asc" }] }),
    db.player.findMany({ orderBy: [{ goals: "desc" }, { name: "asc" }], include: { team: true } }),
    isTournamentFinished(),
    getTournamentLock(),
  ]);

  const byKey = new Map(bets.map((b) => [b.questionKey, b]));

  const questions = TOURNAMENT_QUESTIONS.map((q) => {
    const bet = byKey.get(q.key);
    let status: "fulfilled" | "missed" | "open" = "open";
    if (bet) {
      if (q.pick === "PLAYER") {
        status = bet.player?.isTopScorer ? "fulfilled" : finished ? "missed" : "open";
      } else if (bet.team) {
        status = betStatus(q, { reachedPhase: bet.team.reachedPhase, isChampion: bet.team.isChampion }, finished);
      }
    }
    return {
      ...q,
      pickedTeam: bet?.team ?? null,
      pickedPlayer: bet?.player ?? null,
      earnedPoints: bet?.points ?? null,
      status,
    };
  });

  return { questions, teams, players, lock, finished };
}

/** Favorisierte Teams des Nutzers (Team-Objekte, in Auswahlreihenfolge). */
export async function getFavoriteTeams(userId: string) {
  const favs = await db.favorite.findMany({
    where: { userId },
    orderBy: { position: "asc" },
    include: { team: true },
  });
  return favs.map((f) => f.team);
}

/**
 * Favoriten-Übersicht fürs Dashboard: je Lieblingsland letztes Ergebnis +
 * nächstes Spiel. Greift auf die bereits geladenen Spiele zu (kein Extra-Query).
 */
export function buildFavoritesOverview(
  favoriteCodes: string[],
  matches: MatchWithPrediction[],
  now: Date = new Date(),
) {
  return favoriteCodes
    .map((code) => {
      const own = matches.filter((m) => m.homeTeam?.code === code || m.awayTeam?.code === code);
      const { last, next } = pickLastAndNext(own, now);
      const teamRef =
        own[0]?.homeTeam?.code === code
          ? own[0]?.homeTeam
          : own.find((m) => m.homeTeam?.code === code)?.homeTeam ??
            own.find((m) => m.awayTeam?.code === code)?.awayTeam ??
            null;
      return { code, team: teamRef, last, next };
    })
    .filter((f) => f.team);
}

/** Torschützenliste (aus API-Football synchronisiert). */
export async function getTopScorers(limit = 30) {
  return db.player.findMany({
    where: { goals: { gt: 0 } },
    orderBy: [{ goals: "desc" }, { assists: "desc" }, { name: "asc" }],
    take: limit,
    include: { team: true },
  });
}

/** Team-Tabelle aus abgeschlossenen Spielen. */
export async function getTeamStats() {
  const { buildTeamStats } = await import("./team-stats");
  const [teams, matches] = await Promise.all([
    db.team.findMany({ select: { id: true, name: true, code: true, flagCode: true, group: true } }),
    db.match.findMany({
      where: { status: "finished", homeGoals: { not: null }, awayGoals: { not: null } },
      orderBy: { kickoff: "asc" },
      select: { homeTeamId: true, awayTeamId: true, homeGoals: true, awayGoals: true },
    }),
  ]);
  return buildTeamStats(
    teams,
    matches.map((m) => ({
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeGoals: m.homeGoals!,
      awayGoals: m.awayGoals!,
    })),
  );
}

export interface UserStats {
  totalPoints: number;
  bonusPoints: number;
  correctCount: number;
  scoredCount: number;
  predictedCount: number;
  accuracy: number;
  rank: number | null;
  totalPlayers: number;
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const board = await getLeaderboard();
  const row = board.find((r) => r.userId === userId) ?? null;
  return {
    totalPoints: row?.totalPoints ?? 0,
    bonusPoints: row?.bonusPoints ?? 0,
    correctCount: row?.correctCount ?? 0,
    scoredCount: row?.scoredCount ?? 0,
    predictedCount: row?.predictedCount ?? 0,
    accuracy: row?.accuracy ?? 0,
    rank: row?.rank ?? null,
    totalPlayers: board.length,
  };
}

export type MatchWithPrediction = Awaited<ReturnType<typeof getMatches>>[number];

/**
 * Alle Spiele inkl. Teams und – falls vorhanden – dem Tipp des aktuellen Nutzers.
 * Tipps anderer Nutzer werden NICHT geladen (Sichtbarkeitsregel).
 */
export async function getMatches(userId: string) {
  const matches = await db.match.findMany({
    orderBy: { kickoff: "asc" },
    include: {
      homeTeam: true,
      awayTeam: true,
      predictions: {
        where: { userId },
        select: { prediction: true, points: true, scored: true, isJoker: true },
      },
      goals: {
        orderBy: { minute: "asc" },
        include: { team: { select: { flagCode: true, code: true } } },
      },
    },
  });

  return matches.map((m) => ({
    ...m,
    myPrediction: (m.predictions[0]?.prediction as Prediction | undefined) ?? null,
    myPoints: m.predictions[0]?.points ?? null,
    myScored: m.predictions[0]?.scored ?? false,
    myJoker: m.predictions[0]?.isJoker ?? false,
  }));
}

/**
 * Verteilung der Tipps für ein Spiel – aber nur nach Tipp-Schluss sichtbar,
 * damit niemand beeinflusst wird. (Aggregiert, keine Klarnamen.)
 */
export async function getPredictionDistribution(matchId: string) {
  const grouped = await db.prediction.groupBy({
    by: ["prediction"],
    where: { matchId },
    _count: { prediction: true },
  });
  const dist: Record<Prediction, number> = { HOME_WIN: 0, DRAW: 0, AWAY_WIN: 0 };
  for (const g of grouped) dist[g.prediction as Prediction] = g._count.prediction;
  return dist;
}
