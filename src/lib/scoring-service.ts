import { db } from "./db";
import { scorePrediction } from "./scoring";
import { scoreTournamentBet, topScorerNameMatches } from "./tournament";
import { getQuestion, type Prediction } from "./constants";

/**
 * Markiert das Team (oder bei Gleichstand die Teams) mit den meisten Toren im
 * Turnier (aus den beendeten Spielen). Für die Bonus-Frage "meiste Tore".
 */
export async function recomputeTopScoringTeam(): Promise<void> {
  const matches = await db.match.findMany({
    where: { status: "finished", homeGoals: { not: null }, awayGoals: { not: null } },
    select: { homeTeamId: true, awayTeamId: true, homeGoals: true, awayGoals: true },
  });
  const goals = new Map<string, number>();
  for (const m of matches) {
    if (m.homeTeamId) goals.set(m.homeTeamId, (goals.get(m.homeTeamId) ?? 0) + (m.homeGoals ?? 0));
    if (m.awayTeamId) goals.set(m.awayTeamId, (goals.get(m.awayTeamId) ?? 0) + (m.awayGoals ?? 0));
  }
  let max = 0;
  for (const v of goals.values()) if (v > max) max = v;
  const leaders = max > 0 ? [...goals.entries()].filter(([, v]) => v === max).map(([id]) => id) : [];

  await db.team.updateMany({ data: { isTopScoringTeam: false } });
  if (leaders.length > 0) {
    await db.team.updateMany({ where: { id: { in: leaders } }, data: { isTopScoringTeam: true } });
  }
}

/**
 * Wertet alle Tipps eines abgeschlossenen Spiels aus und speichert die Punkte.
 * Idempotent: kann nach jeder Ergebnisänderung erneut aufgerufen werden.
 */
export async function rescoreMatch(matchId: string): Promise<{ scored: number }> {
  const match = await db.match.findUnique({ where: { id: matchId } });
  if (!match) return { scored: 0 };

  const predictions = await db.prediction.findMany({ where: { matchId } });

  // Spiel nicht abgeschlossen -> Auswertung zurücksetzen.
  if (match.status !== "finished" || match.homeGoals == null || match.awayGoals == null) {
    await db.prediction.updateMany({
      where: { matchId },
      data: { points: null, scored: false },
    });
    return { scored: 0 };
  }

  for (const p of predictions) {
    const points = scorePrediction(p.prediction as Prediction, match.homeGoals, match.awayGoals, {
      jokerMultiplier: p.isJoker ? 2 : 1,
    });
    await db.prediction.update({
      where: { id: p.id },
      data: { points, scored: true },
    });
  }

  return { scored: predictions.length };
}

/**
 * Wertet alle Turnier-Tipps (Bonuspunkte) anhand des aktuellen Team-Fortschritts
 * neu aus. Idempotent – kann nach jeder Team-Aktualisierung erneut laufen.
 */
export async function rescoreTournamentBets(): Promise<{ scored: number }> {
  const [bets, topScorer] = await Promise.all([
    db.tournamentBet.findMany({ include: { team: true, player: true } }),
    db.player.findFirst({ where: { isTopScorer: true }, orderBy: { goals: "desc" } }),
  ]);
  for (const bet of bets) {
    const question = getQuestion(bet.questionKey);
    let points = 0;
    if (question) {
      if (question.pick === "TEXT") {
        // Torschützenkönig per Name: tolerant gegen den tatsächlichen Topscorer.
        points = topScorerNameMatches(bet.playerName, topScorer?.name) ? question.points : 0;
      } else if (question.pick === "PLAYER") {
        points = bet.player?.isTopScorer ? question.points : 0;
      } else if (bet.team) {
        points = scoreTournamentBet(question, {
          reachedPhase: bet.team.reachedPhase,
          isChampion: bet.team.isChampion,
          isTopScoringTeam: bet.team.isTopScoringTeam,
        });
      }
    }
    await db.tournamentBet.update({
      where: { id: bet.id },
      data: { points, scored: true },
    });
  }
  return { scored: bets.length };
}

/** Wertet alle abgeschlossenen Spiele + Turnier-Tipps neu aus. */
export async function rescoreAll(): Promise<{ matches: number; scored: number; tournament: number }> {
  const matches = await db.match.findMany({ select: { id: true } });
  let scored = 0;
  for (const m of matches) {
    const r = await rescoreMatch(m.id);
    scored += r.scored;
  }
  await recomputeTopScoringTeam(); // "meiste Tore"-Team aktualisieren, bevor Bonus gewertet wird
  const t = await rescoreTournamentBets();
  return { matches: matches.length, scored, tournament: t.scored };
}
