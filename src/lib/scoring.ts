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
 * KO-Besonderheit bei AET/PEN (Verlängerung/Elfmeter):
 *  - HOME_WIN / AWAY_WIN korrekt getippt → 3 Punkte (egal ob FT oder AET/PEN)
 *  - DRAW + korrekter V/E-Sieger → 5 Punkte (3 Basis + 2 Bonus)
 *  - DRAW + falscher V/E-Sieger → 0 Punkte
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

  // Spiel ging in V/E + DRAW getippt: Sonderregel
  const wentToET = opts.apiStatus === "AET" || opts.apiStatus === "PEN";
  if (wentToET && prediction === "DRAW") {
    const correct = !!opts.knockoutWinner && opts.knockoutWinner === opts.winner;
    return (correct ? POINTS.CORRECT_DRAW_KNOCKOUT : POINTS.WRONG) * multiplier;
  }

  // Alle anderen Fälle (inkl. HOME_WIN/AWAY_WIN bei AET/PEN): normale 1X2-Logik
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
  if (wentToET && prediction === "DRAW") {
    return !!opts.knockoutWinner && opts.knockoutWinner === opts.winner;
  }
  return prediction === outcomeOf(homeGoals, awayGoals, opts.winner);
}
