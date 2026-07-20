import "server-only";
import { db } from "./db";
import { buildLeaderboard, type LeaderboardRow, type UserScoreInput } from "./ranking";
import { TOURNAMENT_QUESTIONS, getQuestion, PHASES, type Prediction, type Phase } from "./constants";
import { isCorrect } from "./scoring";
import { betStatus, topScorerNameMatches } from "./tournament";
import { pickLastAndNext } from "./favorites";
import { isPickLocked } from "./lock";
import { buildGroupTable, type StandingRow, type FinishedGroupMatch } from "./standings";

export interface TipDistribution {
  HOME_WIN: number;
  DRAW: number;
  AWAY_WIN: number;
  total: number;
}

/** Leaderboard für alle (eingeloggten) Nutzer berechnen (inkl. Turnier-Bonus). */
export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const users = await db.user.findMany({
    // Admins nehmen nicht am Ranking teil (Organisator, nicht Mitspieler)
    where: { blocked: false, role: { not: "ADMIN" } },
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

  // Kalendertag (UTC) eines Anpfiffs – zum Abgrenzen "letzter Spieltag".
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);

  // Letzter Spieltag = jüngster Tag, an dem ein ausgewertetes Spiel lag.
  let lastDay: string | null = null;
  for (const u of users) {
    for (const p of u.predictions) {
      if (!p.scored) continue;
      const k = dayKey(p.match.kickoff);
      if (lastDay === null || k > lastDay) lastDay = k;
    }
  }

  const buildInputs = (excludeLastDay: boolean): UserScoreInput[] =>
    users.map((u) => {
      const scored = u.predictions.filter(
        (p) => p.scored && (!excludeLastDay || lastDay === null || dayKey(p.match.kickoff) !== lastDay),
      );
      const recentPoints = [...scored]
        .sort((a, b) => b.match.kickoff.getTime() - a.match.kickoff.getTime())
        .slice(0, 5)
        .map((p) => p.points ?? 0);

      const matchPoints = scored.reduce((s, p) => s + (p.points ?? 0), 0);
      // Bonuspunkte haben kein Datum -> in beide Stände gleich einfließen lassen.
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

  const board = buildLeaderboard(buildInputs(false));

  // Vorheriger Stand (ohne letzten Spieltag) -> Rang-Bewegung ableiten.
  const prevRankById = new Map(
    buildLeaderboard(buildInputs(true)).map((r) => [r.userId, r.rank] as const),
  );

  return board.map((r) => {
    const prev = prevRankById.get(r.userId);
    return { ...r, rankDelta: lastDay && prev != null ? prev - r.rank : 0 };
  });
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
  const [bets, teams, players, topScorer, finished, lock] = await Promise.all([
    db.tournamentBet.findMany({ where: { userId }, include: { team: true, player: { include: { team: true } } } }),
    db.team.findMany({ orderBy: [{ group: "asc" }, { name: "asc" }] }),
    db.player.findMany({ orderBy: [{ goals: "desc" }, { name: "asc" }], include: { team: true } }),
    db.player.findFirst({ where: { isTopScorer: true }, orderBy: { goals: "desc" } }),
    isTournamentFinished(),
    getTournamentLock(),
  ]);

  const byKey = new Map(bets.map((b) => [b.questionKey, b]));

  const questions = TOURNAMENT_QUESTIONS.map((q) => {
    const bet = byKey.get(q.key);
    let status: "fulfilled" | "missed" | "open" = "open";
    if (bet) {
      if (q.pick === "TEXT") {
        const hit = topScorerNameMatches(bet.playerName, topScorer?.name);
        status = hit ? "fulfilled" : finished ? "missed" : "open";
      } else if (q.pick === "PLAYER") {
        status = bet.player?.isTopScorer ? "fulfilled" : finished ? "missed" : "open";
      } else if (bet.team) {
        status = betStatus(
          q,
          {
            reachedPhase: bet.team.reachedPhase,
            isChampion: bet.team.isChampion,
            isTopScoringTeam: bet.team.isTopScoringTeam,
          },
          finished,
        );
      }
    }
    return {
      ...q,
      pickedTeam: bet?.team ?? null,
      pickedPlayer: bet?.player ?? null,
      pickedPlayerName: bet?.playerName ?? null,
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
        select: { prediction: true, points: true, scored: true, isJoker: true, knockoutWinner: true },
      },
      goals: {
        orderBy: { minute: "asc" },
        include: { team: { select: { flagCode: true, code: true } } },
      },
    },
  });

  // Tipp-Verteilung der ganzen Gruppe in EINER Abfrage (aggregiert, ohne Namen).
  // Wird unten nur für bereits gesperrte Spiele angehängt -> kein Vorab-Verraten.
  const grouped = await db.prediction.groupBy({
    by: ["matchId", "prediction"],
    _count: { _all: true },
  });
  const distByMatch = new Map<string, TipDistribution>();
  for (const g of grouped) {
    const d = distByMatch.get(g.matchId) ?? { HOME_WIN: 0, DRAW: 0, AWAY_WIN: 0, total: 0 };
    d[g.prediction as Prediction] = g._count._all;
    d.total += g._count._all;
    distByMatch.set(g.matchId, d);
  }

  return matches.map((m) => ({
    ...m,
    myPrediction: (m.predictions[0]?.prediction as Prediction | undefined) ?? null,
    myKnockoutWinner: (m.predictions[0]?.knockoutWinner as "HOME" | "AWAY" | undefined) ?? null,
    myPoints: m.predictions[0]?.points ?? null,
    myScored: m.predictions[0]?.scored ?? false,
    myJoker: m.predictions[0]?.isJoker ?? false,
    tipDistribution: distByMatch.get(m.id) ?? null,
  }));
}

/** Ein einzelnes Spiel inkl. Teams, Toren und dem Tipp des Nutzers (Detailseite). */
export async function getMatchById(matchId: string, userId: string) {
  const m = await db.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: true,
      awayTeam: true,
      predictions: {
        where: { userId },
        select: { prediction: true, points: true, scored: true, isJoker: true, knockoutWinner: true },
      },
      goals: {
        orderBy: { minute: "asc" },
        include: { team: { select: { flagCode: true, code: true } } },
      },
    },
  });
  if (!m) return null;
  return {
    ...m,
    myPrediction: (m.predictions[0]?.prediction as Prediction | undefined) ?? null,
    myKnockoutWinner: (m.predictions[0]?.knockoutWinner as "HOME" | "AWAY" | undefined) ?? null,
    myPoints: m.predictions[0]?.points ?? null,
    myScored: m.predictions[0]?.scored ?? false,
    myJoker: m.predictions[0]?.isJoker ?? false,
  };
}
export type MatchDetailData = NonNullable<Awaited<ReturnType<typeof getMatchById>>>;

export interface GroupStanding {
  group: string;
  rows: StandingRow[];
}

/** Tabellen aller Gruppen aus den beendeten Gruppenspielen berechnen. */
export async function getGroupStandings(): Promise<GroupStanding[]> {
  const teamSel = { select: { code: true, name: true, flagCode: true } };
  const [teams, matches] = await Promise.all([
    db.team.findMany({
      where: { group: { not: null } },
      select: { code: true, name: true, flagCode: true, group: true },
    }),
    db.match.findMany({
      where: {
        phase: "GROUP",
        status: "finished",
        homeGoals: { not: null },
        awayGoals: { not: null },
        homeTeamId: { not: null },
        awayTeamId: { not: null },
      },
      select: { group: true, homeGoals: true, awayGoals: true, homeTeam: teamSel, awayTeam: teamSel },
    }),
  ]);

  const teamsByGroup = new Map<string, { code: string; name: string; flagCode: string | null }[]>();
  for (const t of teams) {
    const g = t.group!;
    if (!teamsByGroup.has(g)) teamsByGroup.set(g, []);
    teamsByGroup.get(g)!.push({ code: t.code, name: t.name, flagCode: t.flagCode });
  }

  const matchesByGroup = new Map<string, FinishedGroupMatch[]>();
  for (const m of matches) {
    if (!m.group || !m.homeTeam || !m.awayTeam) continue;
    if (!matchesByGroup.has(m.group)) matchesByGroup.set(m.group, []);
    matchesByGroup.get(m.group)!.push({
      home: m.homeTeam,
      away: m.awayTeam,
      homeGoals: m.homeGoals!,
      awayGoals: m.awayGoals!,
    });
  }

  return [...teamsByGroup.keys()]
    .sort()
    .map((group) => ({
      group,
      rows: buildGroupTable(teamsByGroup.get(group)!, matchesByGroup.get(group) ?? []),
    }));
}

/** Eckdaten des Turniers (Anzahlen + Eröffnungs-/Endspiel-Termin) aus der DB. */
export async function getTournamentFacts() {
  const [teams, totalMatches, agg, groupRows] = await Promise.all([
    db.team.count({ where: { group: { not: null } } }),
    db.match.count(),
    db.match.aggregate({ _min: { kickoff: true }, _max: { kickoff: true } }),
    db.team.findMany({ where: { group: { not: null } }, distinct: ["group"], select: { group: true } }),
  ]);
  return {
    teams,
    matches: totalMatches,
    groups: groupRows.length,
    opening: agg._min.kickoff,
    final: agg._max.kickoff,
  };
}

/** Profil einer Nation: Stammdaten + alle Spiele (chronologisch). */
export async function getTeamProfile(code: string) {
  const team = await db.team.findUnique({
    where: { code },
    select: { code: true, name: true, flagCode: true, group: true, reachedPhase: true, isChampion: true, apiTeamId: true },
  });
  if (!team) return null;

  const teamSel = { select: { code: true, name: true, flagCode: true } };
  const matches = await db.match.findMany({
    where: { OR: [{ homeTeam: { code } }, { awayTeam: { code } }] },
    orderBy: { kickoff: "asc" },
    select: {
      id: true,
      phase: true,
      group: true,
      roundLabel: true,
      kickoff: true,
      status: true,
      homeGoals: true,
      awayGoals: true,
      winner: true,
      homePlaceholder: true,
      awayPlaceholder: true,
      homeTeam: teamSel,
      awayTeam: teamSel,
    },
  });

  return { team, matches };
}

export interface FinaleCelebration {
  champion: { name: string; flagCode: string | null };
  final: {
    homeName: string;
    awayName: string;
    homeGoals: number;
    awayGoals: number;
    /** "AET" = nach Verlängerung, "PEN" = nach Elfmeterschießen, sonst null */
    decider: "AET" | "PEN" | null;
    homePenalties: number | null;
    awayPenalties: number | null;
  };
  top3: {
    rank: number;
    displayName: string;
    totalPoints: number;
    matchPoints: number;
    bonusPoints: number;
  }[];
}

/**
 * Daten für das Sieger-Modal nach dem Finale: Weltmeister, Finalergebnis und
 * die drei besten Mitspieler. Gibt null zurück, solange das Finale nicht
 * beendet ist – dann wird das Modal gar nicht erst gerendert.
 */
export async function getFinaleCelebration(): Promise<FinaleCelebration | null> {
  const final = await db.match.findFirst({
    where: { phase: "FINAL", status: "finished" },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!final || final.homeGoals == null || final.awayGoals == null) return null;
  if (!final.homeTeam || !final.awayTeam) return null;

  // Sieger: K.-o.-Feld hat Vorrang (deckt Verlängerung/Elfmeter ab), sonst Tore.
  const championIsHome =
    final.winner === "HOME" ||
    (final.winner !== "AWAY" && final.homeGoals > final.awayGoals);
  const champion = championIsHome ? final.homeTeam : final.awayTeam;

  const board = await getLeaderboard();
  const top3 = board.slice(0, 3).map((r) => {
    const bonusPoints = r.bonusPoints ?? 0;
    return {
      rank: r.rank,
      displayName: r.displayName,
      totalPoints: r.totalPoints,
      matchPoints: r.totalPoints - bonusPoints,
      bonusPoints,
    };
  });
  if (top3.length === 0) return null;

  return {
    champion: { name: champion.name, flagCode: champion.flagCode },
    final: {
      homeName: final.homeTeam.name,
      awayName: final.awayTeam.name,
      homeGoals: final.homeGoals,
      awayGoals: final.awayGoals,
      decider: final.apiStatus === "AET" || final.apiStatus === "PEN" ? final.apiStatus : null,
      homePenalties: final.homePenalties,
      awayPenalties: final.awayPenalties,
    },
    top3,
  };
}

// --- Persönlicher Turnier-Rückblick (History eines Nutzers) ----------------

export interface RecapMatch {
  id: string;
  phase: Phase;
  homeName: string;
  homeCode: string | null;
  homeFlag: string | null;
  awayName: string;
  awayCode: string | null;
  awayFlag: string | null;
  homeGoals: number;
  awayGoals: number;
  /** "AET"/"PEN" für K.-o.-Abschlussart, sonst null */
  apiStatus: string | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  winner: "HOME" | "AWAY" | null;
  prediction: Prediction;
  knockoutWinner: "HOME" | "AWAY" | null;
  joker: boolean;
  points: number | null;
  correct: boolean;
}

export interface RecapBonus {
  key: string;
  pickLabel: string;
  flagCode: string | null;
  points: number | null;
  status: "fulfilled" | "missed" | "open";
}

export interface UserRecap {
  rank: number | null;
  totalPlayers: number;
  totalPoints: number;
  matchPoints: number;
  bonusPoints: number;
  correctCount: number;
  scoredCount: number;
  jokersUsed: number;
  phases: { phase: Phase; matches: RecapMatch[] }[];
  bonus: RecapBonus[];
}

/**
 * Persönliche Turnier-History eines Nutzers: alle getippten (beendeten) Spiele
 * nach Phase gruppiert, plus Bonus-Tipps und eine Kennzahlen-Zusammenfassung.
 * `board` kann durchgereicht werden, um das Leaderboard nicht doppelt zu laden.
 */
export async function getUserRecap(userId: string, board?: LeaderboardRow[]): Promise<UserRecap> {
  const [matches, td, lb] = await Promise.all([
    getMatches(userId),
    getTournamentData(userId),
    board ? Promise.resolve(board) : getLeaderboard(),
  ]);

  // Nur eigene Tipps auf bereits beendete Spiele.
  const mine = matches.filter(
    (m) => m.myPrediction && m.status === "finished" && m.homeGoals != null && m.awayGoals != null,
  );

  const byPhase = new Map<Phase, RecapMatch[]>();
  let matchPoints = 0;
  let correctCount = 0;
  let jokersUsed = 0;

  for (const m of mine) {
    const phase = m.phase as Phase;
    const winner = (m.winner as "HOME" | "AWAY" | null) ?? null;
    const pred = m.myPrediction as Prediction;
    const koWinner = (m.myKnockoutWinner as "HOME" | "AWAY" | null) ?? null;
    matchPoints += m.myPoints ?? 0;
    if ((m.myPoints ?? 0) > 0) correctCount++;
    if (m.myJoker) jokersUsed++;

    const rec: RecapMatch = {
      id: m.id,
      phase,
      homeName: m.homeTeam?.name ?? m.homePlaceholder ?? "—",
      homeCode: m.homeTeam?.code ?? null,
      homeFlag: m.homeTeam?.flagCode ?? null,
      awayName: m.awayTeam?.name ?? m.awayPlaceholder ?? "—",
      awayCode: m.awayTeam?.code ?? null,
      awayFlag: m.awayTeam?.flagCode ?? null,
      homeGoals: m.homeGoals!,
      awayGoals: m.awayGoals!,
      apiStatus: m.apiStatus ?? null,
      homePenalties: m.homePenalties ?? null,
      awayPenalties: m.awayPenalties ?? null,
      winner,
      prediction: pred,
      knockoutWinner: koWinner,
      joker: m.myJoker,
      points: m.myPoints,
      correct: isCorrect(pred, m.homeGoals!, m.awayGoals!, {
        winner,
        apiStatus: m.apiStatus,
        knockoutWinner: koWinner,
      }),
    };
    const arr = byPhase.get(phase) ?? [];
    arr.push(rec);
    byPhase.set(phase, arr);
  }

  const phases = PHASES.filter((p) => byPhase.has(p)).map((p) => ({
    phase: p,
    matches: byPhase.get(p)!,
  }));

  // Bonus-Tipps: nur Fragen, auf die der Nutzer tatsächlich getippt hat.
  const bonus: RecapBonus[] = td.questions
    .filter((q) => q.pickedTeam || q.pickedPlayer || q.pickedPlayerName)
    .map((q) => ({
      key: q.key,
      pickLabel: q.pickedTeam?.name ?? q.pickedPlayer?.name ?? q.pickedPlayerName ?? "—",
      flagCode: q.pickedTeam?.flagCode ?? q.pickedPlayer?.team?.flagCode ?? null,
      points: q.earnedPoints,
      status: q.status,
    }));
  const bonusPoints = bonus.reduce((s, b) => s + (b.points ?? 0), 0);

  const row = lb.find((r) => r.userId === userId) ?? null;

  return {
    rank: row?.rank ?? null,
    totalPlayers: lb.length,
    totalPoints: matchPoints + bonusPoints,
    matchPoints,
    bonusPoints,
    correctCount,
    scoredCount: mine.length,
    jokersUsed,
    phases,
    bonus,
  };
}

export interface FarewellData {
  /** Tippspiel-Sieger (Leaderboard Platz 1); null, falls (theoretisch) keiner. */
  winner: { displayName: string; totalPoints: number } | null;
  recap: UserRecap;
}

/**
 * Daten für das Danke-/Abschluss-Modal (Familie Tayiz): Tippspiel-Sieger +
 * die persönliche History des aktuellen Nutzers. Gibt null zurück, solange das
 * Turnier nicht beendet ist – dann wird das Modal gar nicht erst gerendert.
 */
export async function getFarewellData(userId: string): Promise<FarewellData | null> {
  if (!(await isTournamentFinished())) return null;
  const board = await getLeaderboard();
  if (board.length === 0) return null;
  const recap = await getUserRecap(userId, board);
  const champ = board[0];
  return {
    winner: champ ? { displayName: champ.displayName, totalPoints: champ.totalPoints } : null,
    recap,
  };
}
