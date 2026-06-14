// API-Football / API-Sports v3 Client (Live-Daten: Torschützen & Spiel-Events).
//
// Aktiviert sich nur, wenn APIFOOTBALL_KEY gesetzt ist. Direkter Endpunkt:
//   https://v3.football.api-sports.io   (Header: x-apisports-key)
// Alternativ via RapidAPI (APIFOOTBALL_HOST setzen).
//
// WM 2026 = league 1, season 2026 (per ENV überschreibbar).

const BASE = "https://v3.football.api-sports.io";

export class ApiFootballError extends Error {}

function requireConfig() {
  const key = process.env.APIFOOTBALL_KEY;
  if (!key) throw new ApiFootballError("APIFOOTBALL_KEY ist nicht gesetzt.");
  const league = Number(process.env.APIFOOTBALL_LEAGUE ?? 1);
  const season = Number(process.env.APIFOOTBALL_SEASON ?? 2026);
  const host = process.env.APIFOOTBALL_HOST; // optional (RapidAPI)
  return { key, league, season, host };
}

async function call(path: string, params: Record<string, string | number>) {
  const { key, host } = requireConfig();
  const url = new URL(`${host ? `https://${host}` : BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const headers: Record<string, string> = host
    ? { "x-rapidapi-key": key, "x-rapidapi-host": host }
    : { "x-apisports-key": key };

  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) throw new ApiFootballError(`API-Football HTTP ${res.status}`);
  const json = await res.json();
  if (Array.isArray(json?.errors) ? json.errors.length : Object.keys(json?.errors ?? {}).length) {
    throw new ApiFootballError(`API-Football: ${JSON.stringify(json.errors)}`);
  }
  return json?.response ?? [];
}

export function hasApiFootball(): boolean {
  return !!process.env.APIFOOTBALL_KEY;
}

export interface ApiTopScorer {
  externalId: string;
  name: string;
  teamName: string;
  goals: number;
  assists: number;
  photo: string | null;
}

/** Torschützenliste (top scorers) der Liga/Saison. */
export async function fetchTopScorers(): Promise<ApiTopScorer[]> {
  const { league, season } = requireConfig();
  const rows: any[] = await call("/players/topscorers", { league, season });
  return rows.map((r) => {
    const stat = r.statistics?.[0] ?? {};
    return {
      externalId: String(r.player?.id),
      name: r.player?.name ?? "Unbekannt",
      teamName: stat.team?.name ?? "",
      goals: stat.goals?.total ?? 0,
      assists: stat.goals?.assists ?? 0,
      photo: r.player?.photo ?? null,
    };
  });
}

export interface ApiFixture {
  fixtureId: number;
  date: string;
  round: string; // z. B. "Group A - 1", "Round of 16", "Final"
  venue: string | null;
  city: string | null;
  homeName: string;
  awayName: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: string; // API-Football short status (NS, FT, 1H, …)
  // Sieger laut API (auch nach Verlängerung/Elfmeter); null = unentschieden/offen
  homeWinner: boolean | null;
  awayWinner: boolean | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
}

/** Alle Fixtures der Liga/Saison (Spielplan + Live-Ergebnisse). */
export async function fetchFixtures(): Promise<ApiFixture[]> {
  const { league, season } = requireConfig();
  const rows: any[] = await call("/fixtures", { league, season });
  return rows.map((r) => ({
    fixtureId: r.fixture?.id,
    date: r.fixture?.date,
    round: r.league?.round ?? "",
    venue: r.fixture?.venue?.name ?? null,
    city: r.fixture?.venue?.city ?? null,
    homeName: r.teams?.home?.name ?? "",
    awayName: r.teams?.away?.name ?? "",
    homeGoals: r.goals?.home ?? null,
    awayGoals: r.goals?.away ?? null,
    status: r.fixture?.status?.short ?? "NS",
    homeWinner: r.teams?.home?.winner ?? null,
    awayWinner: r.teams?.away?.winner ?? null,
    homeTeamId: r.teams?.home?.id ?? null,
    awayTeamId: r.teams?.away?.id ?? null,
  }));
}

export interface SquadPlayer {
  id: number;
  name: string;
  age: number | null;
  number: number | null;
  position: string; // "Goalkeeper" | "Defender" | "Midfielder" | "Attacker"
  photo: string | null;
}

/** Kader eines Teams via /players/squads?team=<id>. */
export async function fetchSquad(apiTeamId: number): Promise<SquadPlayer[]> {
  const rows: any[] = await call("/players/squads", { team: apiTeamId });
  const entry = rows[0];
  if (!entry) return [];
  return (entry.players ?? []).map((p: any) => ({
    id: p.id,
    name: p.name ?? "?",
    age: p.age ?? null,
    number: p.number ?? null,
    position: p.position ?? "",
    photo: p.photo ?? null,
  }));
}

export interface ApiGoalEvent {
  externalId: string;
  playerExternalId: string | null;
  playerName: string;
  teamName: string;
  minute: number | null;
  type: "normal" | "penalty" | "own";
}

export interface ApiLineupPlayer {
  number: number | null;
  name: string;
  pos: string | null; // G/D/M/F
  grid: string | null; // z. B. "4:2" (Reihe:Position)
}
export interface ApiLineup {
  teamName: string;
  formation: string | null; // z. B. "4-3-3"
  coach: string | null;
  startXI: ApiLineupPlayer[];
  substitutes: ApiLineupPlayer[];
}

/** Aufstellungen (beide Teams) eines Fixtures. Leer, wenn (noch) keine vorliegt. */
export async function fetchLineups(fixtureId: number): Promise<ApiLineup[]> {
  const rows: any[] = await call("/fixtures/lineups", { fixture: fixtureId });
  const mapP = (p: any): ApiLineupPlayer => ({
    number: p?.player?.number ?? null,
    name: p?.player?.name ?? "?",
    pos: p?.player?.pos ?? null,
    grid: p?.player?.grid ?? null,
  });
  return rows.map((r) => ({
    teamName: r?.team?.name ?? "",
    formation: r?.formation ?? null,
    coach: r?.coach?.name ?? null,
    startXI: (r?.startXI ?? []).map((x: any) => mapP(x)),
    substitutes: (r?.substitutes ?? []).map((x: any) => mapP(x)),
  }));
}

// --- Volle Spiel-Details (für die Match-Detailseite) -----------------------
// Ein Abruf /fixtures?id=<id> liefert bei API-Football zusätzlich events,
// lineups und statistics inline mit – also alles für die Detailseite in 1 Call.

export interface FixtureEvent {
  minute: number | null;
  extra: number | null;
  teamName: string;
  playerName: string | null;
  assistName: string | null;
  type: string; // "Goal" | "Card" | "subst" | "Var"
  detail: string | null; // z. B. "Normal Goal", "Yellow Card", "Substitution 1"
}

export interface FixtureTeamStat {
  teamName: string;
  stats: { type: string; value: string | number | null }[];
}

export interface FixtureDetail {
  fixtureId: number;
  date: string;
  statusShort: string;
  statusLong: string;
  elapsed: number | null;
  referee: string | null;
  venue: string | null;
  city: string | null;
  round: string;
  home: { name: string; logo: string | null; winner: boolean | null };
  away: { name: string; logo: string | null; winner: boolean | null };
  goalsHome: number | null;
  goalsAway: number | null;
  score: {
    halftime: [number | null, number | null];
    fulltime: [number | null, number | null];
    extratime: [number | null, number | null];
    penalty: [number | null, number | null];
  };
  events: FixtureEvent[];
  lineups: ApiLineup[];
  statistics: FixtureTeamStat[];
}

function mapLineupPlayer(p: any): ApiLineupPlayer {
  return {
    number: p?.player?.number ?? null,
    name: p?.player?.name ?? "?",
    pos: p?.player?.pos ?? null,
    grid: p?.player?.grid ?? null,
  };
}

/** Alle Details eines Fixtures (Meta, Stand, Events, Aufstellungen, Statistiken). */
export async function fetchFixtureDetail(fixtureId: number): Promise<FixtureDetail | null> {
  const rows: any[] = await call("/fixtures", { id: fixtureId });
  const r = rows[0];
  if (!r) return null;

  const pair = (o: any): [number | null, number | null] => [o?.home ?? null, o?.away ?? null];

  return {
    fixtureId: r.fixture?.id,
    date: r.fixture?.date,
    statusShort: r.fixture?.status?.short ?? "NS",
    statusLong: r.fixture?.status?.long ?? "",
    elapsed: r.fixture?.status?.elapsed ?? null,
    referee: r.fixture?.referee ?? null,
    venue: r.fixture?.venue?.name ?? null,
    city: r.fixture?.venue?.city ?? null,
    round: r.league?.round ?? "",
    home: {
      name: r.teams?.home?.name ?? "",
      logo: r.teams?.home?.logo ?? null,
      winner: r.teams?.home?.winner ?? null,
    },
    away: {
      name: r.teams?.away?.name ?? "",
      logo: r.teams?.away?.logo ?? null,
      winner: r.teams?.away?.winner ?? null,
    },
    goalsHome: r.goals?.home ?? null,
    goalsAway: r.goals?.away ?? null,
    score: {
      halftime: pair(r.score?.halftime),
      fulltime: pair(r.score?.fulltime),
      extratime: pair(r.score?.extratime),
      penalty: pair(r.score?.penalty),
    },
    events: (r.events ?? []).map((e: any) => ({
      minute: e?.time?.elapsed ?? null,
      extra: e?.time?.extra ?? null,
      teamName: e?.team?.name ?? "",
      playerName: e?.player?.name ?? null,
      assistName: e?.assist?.name ?? null,
      type: e?.type ?? "",
      detail: e?.detail ?? null,
    })),
    lineups: (r.lineups ?? []).map((l: any) => ({
      teamName: l?.team?.name ?? "",
      formation: l?.formation ?? null,
      coach: l?.coach?.name ?? null,
      startXI: (l?.startXI ?? []).map(mapLineupPlayer),
      substitutes: (l?.substitutes ?? []).map(mapLineupPlayer),
    })),
    statistics: (r.statistics ?? []).map((s: any) => ({
      teamName: s?.team?.name ?? "",
      stats: (s?.statistics ?? []).map((x: any) => ({ type: x?.type ?? "", value: x?.value ?? null })),
    })),
  };
}

/** Tor-Ereignisse eines Fixtures. */
export async function fetchFixtureGoals(fixtureId: number): Promise<ApiGoalEvent[]> {
  const rows: any[] = await call("/fixtures/events", { fixture: fixtureId });
  return rows
    .filter((e) => e.type === "Goal")
    .map((e) => {
      const detail = String(e.detail ?? "").toLowerCase();
      const type = detail.includes("own") ? "own" : detail.includes("penalty") ? "penalty" : "normal";
      return {
        externalId: `${fixtureId}-${e.time?.elapsed ?? 0}-${e.player?.id ?? e.player?.name ?? "x"}`,
        playerExternalId: e.player?.id ? String(e.player.id) : null,
        playerName: e.player?.name ?? "Unbekannt",
        teamName: e.team?.name ?? "",
        minute: e.time?.elapsed ?? null,
        type: type as ApiGoalEvent["type"],
      };
    });
}
