// Reine Helfer rund um Favoriten (ohne DB, testbar).

export interface TimedMatch {
  kickoff: Date;
  status: string; // "scheduled" | "live" | "finished"
}

/**
 * Wählt aus einer Liste von Spielen (bereits auf ein Team gefiltert) das
 * jüngste abgeschlossene und das nächste anstehende Spiel.
 */
export function pickLastAndNext<T extends TimedMatch>(
  matches: T[],
  now: Date = new Date(),
): { last: T | null; next: T | null } {
  const t = now.getTime();

  const finished = matches
    .filter((m) => m.status === "finished")
    .sort((a, b) => b.kickoff.getTime() - a.kickoff.getTime());

  const upcoming = matches
    .filter((m) => m.status !== "finished" && m.kickoff.getTime() > t)
    .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());

  return { last: finished[0] ?? null, next: upcoming[0] ?? null };
}
