// football-data.org (v4) Client – kostenlose Quelle, deren Free-Tier die
// FIFA-WM enthält (Spielplan, Ergebnisse, Torschützen).
//
// Aktiviert sich, wenn FOOTBALLDATA_TOKEN gesetzt ist.
//   Base:   https://api.football-data.org/v4
//   Header: X-Auth-Token: <token>
//   WM:     Competition-Code "WC"
//
// Free-Tier: ~10 Anfragen/Minute -> wir machen nur wenige Calls pro Sync.

const BASE = "https://api.football-data.org/v4";

export class FootballDataError extends Error {}

export function hasFootballData(): boolean {
  return !!process.env.FOOTBALLDATA_TOKEN;
}

function competition(): string {
  return process.env.FOOTBALLDATA_COMPETITION ?? "WC";
}

async function call(path: string): Promise<any> {
  const token = process.env.FOOTBALLDATA_TOKEN;
  if (!token) throw new FootballDataError("FOOTBALLDATA_TOKEN ist nicht gesetzt.");
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Auth-Token": token },
    cache: "no-store",
  });
  if (res.status === 429) throw new FootballDataError("Rate-Limit erreicht (10/Min) – kurz warten.");
  if (!res.ok) throw new FootballDataError(`football-data HTTP ${res.status}`);
  return res.json();
}

export interface FDMatch {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED | ...
  stage: string; // GROUP_STAGE | LAST_16 | QUARTER_FINALS | SEMI_FINALS | THIRD_PLACE | FINAL ...
  group: string | null; // "GROUP_A" | null
  homeName: string | null;
  homeTla: string | null;
  awayName: string | null;
  awayTla: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  winner: string | null; // "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null
}

/** Alle WM-Spiele (1 Request). */
export async function fetchWorldCupMatches(): Promise<FDMatch[]> {
  const json = await call(`/competitions/${competition()}/matches`);
  const matches: any[] = json?.matches ?? [];
  return matches.map((m) => ({
    id: m.id,
    utcDate: m.utcDate,
    status: m.status ?? "SCHEDULED",
    stage: m.stage ?? "",
    group: m.group ?? null,
    homeName: m.homeTeam?.name ?? null,
    homeTla: m.homeTeam?.tla ?? null,
    awayName: m.awayTeam?.name ?? null,
    awayTla: m.awayTeam?.tla ?? null,
    homeGoals: m.score?.fullTime?.home ?? null,
    awayGoals: m.score?.fullTime?.away ?? null,
    winner: m.score?.winner ?? null,
  }));
}

export interface FDScorer {
  externalId: string;
  name: string;
  teamName: string | null;
  goals: number;
  assists: number;
}

/** Torschützenliste (1 Request). */
export async function fetchWorldCupScorers(limit = 30): Promise<FDScorer[]> {
  const json = await call(`/competitions/${competition()}/scorers?limit=${limit}`);
  const scorers: any[] = json?.scorers ?? [];
  return scorers.map((s) => ({
    externalId: `fd-${s.player?.id}`,
    name: s.player?.name ?? "Unbekannt",
    teamName: s.team?.name ?? null,
    goals: s.goals ?? 0,
    assists: s.assists ?? 0,
  }));
}
