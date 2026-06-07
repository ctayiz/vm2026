// Reine Logik für das zweite Punktesystem (Turnier-Tipps / Bonuspunkte).
// Keine DB-Abhängigkeit -> gut testbar.

import { reachOrder, type TournamentQuestion } from "./constants";

export interface TeamProgress {
  reachedPhase: string | null; // GROUP|R32|R16|QF|SF|FINAL
  isChampion: boolean;
  isTopScoringTeam?: boolean; // hat die meisten Turnier-Tore
}

/** Name normalisieren (Akzente weg, klein, getrimmt) für robusten Vergleich. */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stimmt der getippte Torschützen-Name mit dem tatsächlichen überein? (tolerant) */
export function topScorerNameMatches(
  guess: string | null | undefined,
  actual: string | null | undefined,
): boolean {
  if (!guess || !actual) return false;
  const g = normalizeName(guess);
  const a = normalizeName(actual);
  if (g.length < 3 || a.length < 3) return false;
  if (a === g || a.includes(g) || g.includes(a)) return true;
  const aLast = a.split(" ").pop() ?? "";
  const gLast = g.split(" ").pop() ?? "";
  return aLast.length >= 3 && aLast === gLast;
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
  if (question.target === "MOST_GOALS") return team.isTopScoringTeam === true;
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
