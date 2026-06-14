// Zentrale "Enums" und Konfiguration. Da SQLite keine Prisma-Enums unterstützt,
// sind die erlaubten Werte hier als const definiert und werden via Zod validiert.

export const PREDICTIONS = ["HOME_WIN", "DRAW", "AWAY_WIN"] as const;
export type Prediction = (typeof PREDICTIONS)[number];

export const MATCH_STATUS = ["scheduled", "live", "finished"] as const;
export type MatchStatus = (typeof MATCH_STATUS)[number];

export const ROLES = ["USER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

// Turnierphasen inkl. WM-2026-spezifischer Runde der letzten 32 (R32).
export const PHASES = ["GROUP", "R32", "R16", "QF", "SF", "TP", "FINAL"] as const;
export type Phase = (typeof PHASES)[number];

// Sortier-Reihenfolge + deutsche Labels der Phasen
export const PHASE_META: Record<Phase, { order: number; label: string; short: string; knockout: boolean }> = {
  GROUP: { order: 0, label: "Gruppenphase", short: "Gruppe", knockout: false },
  R32: { order: 1, label: "Runde der letzten 32", short: "Letzte 32", knockout: true },
  R16: { order: 2, label: "Achtelfinale", short: "Achtelfinale", knockout: true },
  QF: { order: 3, label: "Viertelfinale", short: "Viertelfinale", knockout: true },
  SF: { order: 4, label: "Halbfinale", short: "Halbfinale", knockout: true },
  TP: { order: 5, label: "Spiel um Platz 3", short: "Platz 3", knockout: true },
  FINAL: { order: 6, label: "Finale", short: "Finale", knockout: true },
};

// Tipp-Schluss: X Minuten vor Anpfiff ist der Tipp gesperrt.
export const PICK_LOCK_MINUTES = 15;

// Punktesystem (1X2). Bewusst als Objekt, damit später leicht erweiterbar.
export const POINTS = {
  CORRECT_OUTCOME: 3,
  WRONG: 0,
} as const;

// max. Anzahl Lieblingsländer pro Nutzer
export const MAX_FAVORITES = 3;

// max. Anzahl Joker pro Nutzer fürs gesamte Turnier (verdoppeln je Spiel-Punkte)
export const MAX_JOKERS = 3;

export const SESSION_COOKIE = "wm_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 Tage

// --- Turnier-Tipps (Bonuspunkte) ------------------------------------------
// "Reach"-Reihenfolge: bis zu welcher Runde ist ein Team gekommen.
// (TP/Spiel um Platz 3 zählt als SF erreicht – die Verlierer der Halbfinals.)
export const REACH_PHASES = ["GROUP", "R32", "R16", "QF", "SF", "FINAL"] as const;
export type ReachPhase = (typeof REACH_PHASES)[number];

export function reachOrder(phase: string | null | undefined): number {
  if (!phase) return -1;
  const i = (REACH_PHASES as readonly string[]).indexOf(phase);
  return i;
}

// Ziel einer Frage: entweder eine Mindest-Runde oder der Titel.
export type BetTarget = ReachPhase | "CHAMPION" | "MOST_GOALS";

export interface TournamentQuestion {
  key: string;
  label: string;
  hint: string;
  target: BetTarget; // bei TEXT-Fragen irrelevant ("CHAMPION" als Platzhalter)
  points: number;
  // worauf wird getippt: Team, Spieler-Auswahl, oder Freitext (Torschützenkönig)
  pick: "TEAM" | "PLAYER" | "TEXT";
  // true = Punkte erst nach dem Finale vergeben (kein Zwischen-Award)
  finalOnly?: boolean;
}

// Fragen sind bewusst hier zentral definiert -> leicht erweiterbar.
export const TOURNAMENT_QUESTIONS: TournamentQuestion[] = [
  {
    key: "champion",
    label: "Wer wird Weltmeister?",
    hint: "Volle Punktzahl für den richtigen Titelträger.",
    target: "CHAMPION",
    points: 20,
    pick: "TEAM",
  },
  {
    key: "topscorer",
    label: "Wer wird Torschützenkönig?",
    hint: "Namen eintippen – Punkte für den Spieler mit den meisten Toren.",
    target: "CHAMPION",
    points: 15,
    pick: "TEXT",
    finalOnly: true,
  },
  {
    key: "mostgoals",
    label: "Welche Mannschaft schießt die meisten Tore?",
    hint: "Punkte für das Team mit den meisten Toren im gesamten Turnier.",
    target: "MOST_GOALS",
    points: 12,
    pick: "TEAM",
    finalOnly: true,
  },
  {
    key: "final",
    label: "Welches Team erreicht das Finale?",
    hint: "Punkte, wenn dein Team im Endspiel steht.",
    target: "FINAL",
    points: 10,
    pick: "TEAM",
  },
  {
    key: "semi",
    label: "Welches Team erreicht das Halbfinale?",
    hint: "Punkte ab Erreichen des Halbfinales.",
    target: "SF",
    points: 7,
    pick: "TEAM",
  },
  {
    key: "r16",
    label: "Welches Team erreicht das Achtelfinale?",
    hint: "Punkte ab Erreichen des Achtelfinales.",
    target: "R16",
    points: 5,
    pick: "TEAM",
  },
  {
    key: "r32",
    label: "Welches Team erreicht die Runde der letzten 32?",
    hint: "Punkte ab Erreichen der K.-o.-Phase.",
    target: "R32",
    points: 3,
    pick: "TEAM",
  },
];

export function getQuestion(key: string): TournamentQuestion | undefined {
  return TOURNAMENT_QUESTIONS.find((q) => q.key === key);
}
