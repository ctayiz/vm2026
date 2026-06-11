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
