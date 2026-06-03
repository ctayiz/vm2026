import { db } from "./db";
import { scorePrediction } from "./scoring";
import { scoreTournamentBet } from "./tournament";
import { getQuestion, type Prediction } from "./constants";

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
  const bets = await db.tournamentBet.findMany({ include: { team: true, player: true } });
  for (const bet of bets) {
    const question = getQuestion(bet.questionKey);
    let points = 0;
    if (question) {
      if (question.pick === "PLAYER") {
        // Torschützenkönig: Punkte, wenn der getippte Spieler Topscorer ist.
        points = bet.player?.isTopScorer ? question.points : 0;
      } else if (bet.team) {
        points = scoreTournamentBet(question, {
          reachedPhase: bet.team.reachedPhase,
          isChampion: bet.team.isChampion,
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
  const t = await rescoreTournamentBets();
  return { matches: matches.length, scored, tournament: t.scored };
}
