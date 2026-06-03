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
 * Zentrale Scoring-Funktion (1X2).
 *
 * Bewusst erweiterbar gehalten: zusätzliche Regeln (Joker, Bonus für
 * Gruppensieger/Weltmeister, Serien-Bonus) lassen sich als optionale
 * Multiplikatoren/Summanden über `opts` ergänzen, ohne den Kern zu brechen.
 */
export function scorePrediction(
  prediction: Prediction,
  homeGoals: number,
  awayGoals: number,
  opts: { jokerMultiplier?: number } = {},
): number {
  const actual = outcomeFromGoals(homeGoals, awayGoals);
  const base = prediction === actual ? POINTS.CORRECT_OUTCOME : POINTS.WRONG;
  const multiplier = opts.jokerMultiplier ?? 1;
  return base * multiplier;
}

export function isCorrect(prediction: Prediction, homeGoals: number, awayGoals: number): boolean {
  return prediction === outcomeFromGoals(homeGoals, awayGoals);
}
