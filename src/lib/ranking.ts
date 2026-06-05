// Reine Ranking-Logik (ohne DB), damit gut testbar.

export interface UserScoreInput {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  createdAt: Date;
  // bereits ausgewertete Tipps dieses Nutzers
  totalPoints: number; // Gesamtpunkte (Spiel-Tipps + Turnier-Bonus)
  correctCount: number;
  scoredCount: number; // ausgewertete Tipps
  predictedCount: number; // insgesamt abgegebene Tipps
  // Punkte der letzten N ausgewerteten Spiele (neueste zuerst), z. B. für Formkurve
  recentPoints: number[];
  // davon aus Turnier-Tipps (Bonus), nur zur Anzeige
  bonusPoints?: number;
}

export interface LeaderboardRow extends UserScoreInput {
  rank: number;
  accuracy: number; // 0..1 (correct / scored)
  // Rang-Bewegung seit dem letzten Spieltag (positiv = aufgestiegen). 0/undefined = keine.
  rankDelta?: number;
}

/**
 * Sortierung bei Punktgleichheit:
 * 1. mehr Punkte
 * 2. mehr richtige Tipps
 * 3. bessere Trefferquote
 * 4. früher registriert
 * 5. alphabetisch nach Anzeigename
 */
export function compareUsers(a: UserScoreInput, b: UserScoreInput): number {
  if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
  if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;

  const accA = accuracyOf(a);
  const accB = accuracyOf(b);
  if (accB !== accA) return accB - accA;

  const tA = a.createdAt.getTime();
  const tB = b.createdAt.getTime();
  if (tA !== tB) return tA - tB;

  return a.displayName.localeCompare(b.displayName, "de");
}

export function accuracyOf(u: UserScoreInput): number {
  return u.scoredCount > 0 ? u.correctCount / u.scoredCount : 0;
}

/**
 * Baut das sortierte Leaderboard inkl. Rang und Trefferquote.
 * Gleiche Punkte+Tiebreaker erhalten denselben Rang (Standard-Competition-Ranking).
 */
export function buildLeaderboard(users: UserScoreInput[]): LeaderboardRow[] {
  const sorted = [...users].sort(compareUsers);

  const rows: LeaderboardRow[] = [];
  let lastRank = 0;
  sorted.forEach((u, i) => {
    const prev = i > 0 ? sorted[i - 1] : null;
    // gleicher Rang nur bei identischem (Punkte, richtige, Quote)-Tupel
    const tie =
      prev !== null &&
      prev.totalPoints === u.totalPoints &&
      prev.correctCount === u.correctCount &&
      accuracyOf(prev) === accuracyOf(u);
    const rank = tie ? lastRank : i + 1;
    lastRank = rank;
    rows.push({ ...u, rank, accuracy: accuracyOf(u) });
  });

  return rows;
}
