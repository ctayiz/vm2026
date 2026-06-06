// Reine Gruppentabellen-Logik (ohne DB, gut testbar).

export interface StandTeam {
  code: string;
  name: string;
  flagCode: string | null;
}

export interface FinishedGroupMatch {
  home: StandTeam;
  away: StandTeam;
  homeGoals: number;
  awayGoals: number;
}

export interface StandingRow extends StandTeam {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number; // Tore
  ga: number; // Gegentore
  gd: number; // Tordifferenz
  points: number;
  rank: number;
}

/**
 * Tabelle einer Gruppe aus den Teams + ihren beendeten Spielen berechnen.
 * Sortierung: Punkte, Tordifferenz, geschossene Tore, dann Name (alphabetisch).
 * (Vereinfachte FIFA-Regeln – reicht für die Anzeige.)
 */
export function buildGroupTable(teams: StandTeam[], matches: FinishedGroupMatch[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const t of teams) {
    rows.set(t.code, {
      ...t,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
      rank: 0,
    });
  }

  for (const m of matches) {
    const h = rows.get(m.home.code);
    const a = rows.get(m.away.code);
    if (!h || !a) continue; // Spiel gehört nicht zu diesen Teams
    h.played++;
    a.played++;
    h.gf += m.homeGoals;
    h.ga += m.awayGoals;
    a.gf += m.awayGoals;
    a.ga += m.homeGoals;
    if (m.homeGoals > m.awayGoals) {
      h.won++;
      a.lost++;
      h.points += 3;
    } else if (m.homeGoals < m.awayGoals) {
      a.won++;
      h.lost++;
      a.points += 3;
    } else {
      h.drawn++;
      a.drawn++;
      h.points += 1;
      a.points += 1;
    }
  }

  const sorted = [...rows.values()].map((r) => ({ ...r, gd: r.gf - r.ga }));
  sorted.sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.gd !== x.gd) return y.gd - x.gd;
    if (y.gf !== x.gf) return y.gf - x.gf;
    return x.name.localeCompare(y.name, "de");
  });
  sorted.forEach((r, i) => (r.rank = i + 1));
  return sorted;
}
