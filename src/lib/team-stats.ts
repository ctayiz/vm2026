// Team-Statistiken aus abgeschlossenen Spielen berechnen (reine Logik, testbar).

export interface FinishedMatch {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeGoals: number;
  awayGoals: number;
}

export interface TeamRef {
  id: string;
  name: string;
  code: string;
  flagCode: string | null;
  group: string | null;
}

export interface TeamStatsRow extends TeamRef {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number; // 3/1/0 (Fußball-Tabelle)
  form: ("W" | "D" | "L")[]; // jüngste zuerst
}

/**
 * Aggregiert die abgeschlossenen Spiele zu einer Tabelle.
 * `matches` sollte chronologisch (alt -> neu) sortiert sein, damit die Form stimmt.
 */
export function buildTeamStats(teams: TeamRef[], matches: FinishedMatch[]): TeamStatsRow[] {
  const map = new Map<string, TeamStatsRow>();
  for (const t of teams) {
    map.set(t.id, {
      ...t,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
      form: [],
    });
  }

  const apply = (teamId: string | null, gf: number, ga: number) => {
    if (!teamId) return;
    const row = map.get(teamId);
    if (!row) return;
    row.played++;
    row.goalsFor += gf;
    row.goalsAgainst += ga;
    if (gf > ga) {
      row.won++;
      row.points += 3;
      row.form.unshift("W");
    } else if (gf < ga) {
      row.lost++;
      row.form.unshift("L");
    } else {
      row.drawn++;
      row.points += 1;
      row.form.unshift("D");
    }
  };

  for (const m of matches) {
    apply(m.homeTeamId, m.homeGoals, m.awayGoals);
    apply(m.awayTeamId, m.awayGoals, m.homeGoals);
  }

  const rows = [...map.values()];
  for (const r of rows) {
    r.goalDiff = r.goalsFor - r.goalsAgainst;
    r.form = r.form.slice(0, 5);
  }

  // nur Teams mit mind. einem Spiel, sortiert wie eine Tabelle
  return rows
    .filter((r) => r.played > 0)
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDiff - a.goalDiff ||
        b.goalsFor - a.goalsFor ||
        a.name.localeCompare(b.name, "de"),
    );
}
