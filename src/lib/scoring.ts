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
 * Zentrale Scoring-Funktion (1X2). `winner` (K.-o.-Sieger) hat Vorrang vor dem
 * reinen Torergebnis.
 */
export function scorePrediction(
  prediction: Prediction,
  homeGoals: number,
  awayGoals: number,
  opts: { jokerMultiplier?: number; winner?: "HOME" | "AWAY" | null } = {},
): number {
  const actual = outcomeOf(homeGoals, awayGoals, opts.winner);
  const base = prediction === actual ? POINTS.CORRECT_OUTCOME : POINTS.WRONG;
  const multiplier = opts.jokerMultiplier ?? 1;
  return base * multiplier;
}

export function isCorrect(
  prediction: Prediction,
  homeGoals: number,
  awayGoals: number,
  winner?: "HOME" | "AWAY" | null,
): boolean {
  return prediction === outcomeOf(homeGoals, awayGoals, winner);
}
