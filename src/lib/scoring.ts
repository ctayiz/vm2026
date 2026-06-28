import { POINTS, type Prediction } from "./constants";

export type Outcome = Prediction; // HOME_WIN | DRAW | AWAY_WIN

/**
 * Ergebnis (Tore) -> 1X2-Ausgang.
 */
export function outcomeFromGoals(homeGoals: number, awayGoals: number): Outcome {
  if (homeGoals > awayGoals) return "HOME_WIN";
  if (homeGoals < awayGoals) return "AWAY_WIN";
  return "DRAW";
}

/**
 * Tatsächlicher Ausgang inkl. K.-o.-Sieger: Bei K.-o.-Spielen gibt es kein
 * Unentschieden – steht ein Sieger fest (Verlängerung/Elfmeter), zählt dieser,
 * auch wenn das Torergebnis gleich ist. Sonst normaler 1X2-Ausgang.
 */
export function outcomeOf(
  homeGoals: number,
  awayGoals: number,
  winner?: "HOME" | "AWAY" | null,
): Outcome {
  if (winner === "HOME") return "HOME_WIN";
  if (winner === "AWAY") return "AWAY_WIN";
  return outcomeFromGoals(homeGoals, awayGoals);
}

/**
 * Zentrale Scoring-Funktion (1X2).
 *
 * KO-Besonderheit: War das Spiel ein K.-o.-Spiel das in die Verlängerung/
 * ins Elfmeterschießen ging (apiStatus = "AET" | "PEN"), zählt:
 *  - DRAW + korrekter V/E-Sieger (knockoutWinner = match.winner) → richtig
 *  - HOME_WIN / AWAY_WIN → falsch (auch wenn das Team am Ende gewonnen hat)
 * Bei regulärem FT-Ende oder Gruppenspiel gilt die normale 1X2-Logik.
 */
export function scorePrediction(
  prediction: Prediction,
  homeGoals: number,
  awayGoals: number,
  opts: {
    jokerMultiplier?: number;
    winner?: "HOME" | "AWAY" | null;
    apiStatus?: string | null;
    knockoutWinner?: string | null;
  } = {},
): number {
  const multiplier = opts.jokerMultiplier ?? 1;

  const wentToET = opts.apiStatus === "AET" || opts.apiStatus === "PEN";
  if (wentToET) {
    if (prediction === "DRAW") {
      const correct = !!opts.knockoutWinner && opts.knockoutWinner === opts.winner;
      return (correct ? POINTS.CORRECT_OUTCOME : POINTS.WRONG) * multiplier;
    }
    // Direkter Sieg getippt, aber Spiel ging in V/E → falsch
    return POINTS.WRONG * multiplier;
  }

  const actual = outcomeOf(homeGoals, awayGoals, opts.winner);
  const base = prediction === actual ? POINTS.CORRECT_OUTCOME : POINTS.WRONG;
  return base * multiplier;
}

export function isCorrect(
  prediction: Prediction,
  homeGoals: number,
  awayGoals: number,
  opts: { winner?: "HOME" | "AWAY" | null; apiStatus?: string | null; knockoutWinner?: string | null } = {},
): boolean {
  const wentToET = opts.apiStatus === "AET" || opts.apiStatus === "PEN";
  if (wentToET) {
    if (prediction === "DRAW") return !!opts.knockoutWinner && opts.knockoutWinner === opts.winner;
    return false;
  }
  return prediction === outcomeOf(homeGoals, awayGoals, opts.winner);
}
