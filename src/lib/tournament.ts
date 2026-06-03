// Reine Logik für das zweite Punktesystem (Turnier-Tipps / Bonuspunkte).
// Keine DB-Abhängigkeit -> gut testbar.

import { reachOrder, type TournamentQuestion } from "./constants";

export interface TeamProgress {
  reachedPhase: string | null; // GROUP|R32|R16|QF|SF|FINAL
  isChampion: boolean;
}

/** Hat das Team mindestens die Zielrunde erreicht? */
export function reachedAtLeast(reachedPhase: string | null, target: string): boolean {
  const r = reachOrder(reachedPhase);
  const t = reachOrder(target);
  if (r < 0 || t < 0) return false;
  return r >= t;
}

/**
 * Erfüllt das getippte Team die Frage?
 *  - CHAMPION: Team ist Weltmeister
 *  - sonst: Team hat die Zielrunde (mindestens) erreicht
 */
export function isBetFulfilled(question: TournamentQuestion, team: TeamProgress): boolean {
  if (question.target === "CHAMPION") return team.isChampion === true;
  return reachedAtLeast(team.reachedPhase, question.target);
}

/** Bonuspunkte für einen Turnier-Tipp. */
export function scoreTournamentBet(question: TournamentQuestion, team: TeamProgress): number {
  return isBetFulfilled(question, team) ? question.points : 0;
}

/**
 * Status eines Turnier-Tipps für die Anzeige.
 *  - "fulfilled": Ziel erreicht (Punkte erhalten) – monoton, bleibt erfüllt
 *  - "missed":    Turnier vorbei und Ziel nicht erreicht
 *  - "open":      noch offen (Ausgang nicht entschieden)
 *
 * Bewusst konservativ: ein „verpasst" wird erst nach Turnierende angezeigt,
 * damit mitten im Turnier keine falsche Aussage entsteht.
 */
export function betStatus(
  question: TournamentQuestion,
  team: TeamProgress,
  tournamentFinished: boolean,
): "fulfilled" | "missed" | "open" {
  if (isBetFulfilled(question, team)) return "fulfilled";
  return tournamentFinished ? "missed" : "open";
}
