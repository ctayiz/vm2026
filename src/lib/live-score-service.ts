// API-Football (api-sports.io) ist die ALLEINIGE Datenquelle für Live-/Endstände,
// Status, K.-o.-Sieger und das Auflösen der K.-o.-Paarungen. Ein Abruf
// (/fixtures?league&season) liefert alle Spiele inkl. aktuellem Stand.
//
// Knackpunkt: Unsere Teams heißen deutsch ("Mexiko"), API-Football englisch
// ("Mexico"). Wir überbrücken das exakt über den FIFA-Code: englischer Name ->
// FIFA-Code -> unser Team. Zugeordnet wird ein Spiel über das (ungeordnete)
// Code-Paar (Gruppenphase) bzw. über den exakten Anpfiff (K.-o. mit Platzhaltern).

import { db } from "./db";
import { fetchFixtures, fetchLiveFixtures, hasApiFootball } from "./api-football";
import { PHASE_META, type Phase } from "./constants";

// API-Football Kurz-Status -> unser Status
const LIVE = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);
const FINISHED = new Set(["FT", "AET", "PEN", "WO", "AWD"]);

/** Englische API-Namen (inkl. gängiger Schreibvarianten) je FIFA-Code. */
const EN_ALIASES: Record<string, string[]> = {
  MEX: ["mexico"],
  RSA: ["southafrica"],
  KOR: ["southkorea", "korearepublic", "korearep"],
  CZE: ["czechrepublic", "czechia"],
  BIH: ["bosniaandherzegovina", "bosniaherzegovina", "bosnia"],
  CAN: ["canada"],
  QAT: ["qatar"],
  SUI: ["switzerland"],
  BRA: ["brazil"],
  HAI: ["haiti"],
  MAR: ["morocco"],
  SCO: ["scotland"],
  AUS: ["australia"],
  PAR: ["paraguay"],
  TUR: ["turkey", "turkiye"],
  USA: ["usa", "unitedstates", "unitedstatesofamerica"],
  CUW: ["curacao"],
  GER: ["germany"],
  ECU: ["ecuador"],
  CIV: ["ivorycoast", "cotedivoire"],
  JPN: ["japan"],
  NED: ["netherlands", "holland"],
  SWE: ["sweden"],
  TUN: ["tunisia"],
  BEL: ["belgium"],
  IRN: ["iran", "iriran"],
  NZL: ["newzealand"],
  EGY: ["egypt"],
  CPV: ["capeverde", "caboverde", "capeverdeislands"],
  KSA: ["saudiarabia"],
  ESP: ["spain"],
  URU: ["uruguay"],
  FRA: ["france"],
  IRQ: ["iraq"],
  NOR: ["norway"],
  SEN: ["senegal"],
  ALG: ["algeria"],
  ARG: ["argentina"],
  JOR: ["jordan"],
  AUT: ["austria"],
  COD: ["congodr", "drcongo", "democraticrepublicofcongo", "congodemocraticrepublic"],
  COL: ["colombia"],
  POR: ["portugal"],
  UZB: ["uzbekistan"],
  ENG: ["england"],
  GHA: ["ghana"],
  CRO: ["croatia"],
  PAN: ["panama"],
};

const NAME_TO_CODE = new Map<string, string>();
for (const [code, aliases] of Object.entries(EN_ALIASES)) {
  for (const a of aliases) NAME_TO_CODE.set(a, code);
}

/** Normalisiert einen Ländernamen (klein, ohne Akzente/Sonderzeichen). */
function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
}

function codeOf(name: string): string | null {
  return NAME_TO_CODE.get(norm(name)) ?? null;
}

/** Englischer API-Teamname -> unser FIFA-Code (z. B. "Mexico" -> "MEX"). */
export function apiNameToCode(name: string): string | null {
  return codeOf(name);
}

export type SyncResult = {
  ok: boolean;
  updated: number; // Spiele mit Stand/Status-Änderung
  live: number;
  checked: number;
  resolved: number; // K.-o.-Paarungen neu aufgelöst
  newlyFinished: number; // Spiele, die in diesem Lauf auf "finished" gewechselt sind
  note?: string;
};

type OurMatch = Awaited<ReturnType<typeof loadMatches>>[number];
function loadMatches() {
  return db.match.findMany({ include: { homeTeam: true, awayTeam: true } });
}

/**
 * Holt alle Fixtures von API-Football und übernimmt sie in unsere DB:
 *  - apiFixtureId merken (für Detail-Abrufe)
 *  - Status, Tore, K.-o.-Sieger (beendete Spiele nie zurückstufen)
 *  - Stadion/Stadt nachfüllen, falls leer
 *  - K.-o.-Paarungen auflösen, sobald die Teams feststehen
 */
export async function syncApiFootball(): Promise<SyncResult> {
  if (!hasApiFootball()) return { ok: false, updated: 0, live: 0, checked: 0, resolved: 0, newlyFinished: 0, note: "APIFOOTBALL_KEY fehlt" };

  // Basisplan laden; Live-Daten überschreiben gecachte Einträge für laufende Spiele.
  const [allFixtures, liveFixtures] = await Promise.all([fetchFixtures(), fetchLiveFixtures()]);
  const liveById = new Map(liveFixtures.map((f) => [f.fixtureId, f]));
  const fixtures = allFixtures.map((f) => liveById.get(f.fixtureId) ?? f);
  const ours = await loadMatches();
  const teams = await db.team.findMany({ select: { id: true, code: true, apiTeamId: true } });
  const teamByCode = new Map(teams.map((t) => [t.code, t]));
  const teamIdByCode = new Map(teams.map((t) => [t.code, t.id]));
  const pendingApiTeamIds = new Map<string, number>(); // db team id -> API team id

  // Index: Gruppen-/aufgelöste Spiele nach ungeordnetem Code-Paar
  const byPair = new Map<string, OurMatch[]>();
  for (const m of ours) {
    if (!m.homeTeam || !m.awayTeam) continue;
    const key = [m.homeTeam.code, m.awayTeam.code].sort().join("|");
    (byPair.get(key) ?? byPair.set(key, []).get(key)!).push(m);
  }
  // Index: noch offene K.-o.-Spiele (Platzhalter) nach Anpfiff-Zeit
  const koByTime = new Map<number, OurMatch[]>();
  for (const m of ours) {
    if (m.homeTeam && m.awayTeam) continue;
    const k = m.kickoff.getTime();
    (koByTime.get(k) ?? koByTime.set(k, []).get(k)!).push(m);
  }

  let updated = 0;
  let live = 0;
  let checked = 0;
  let resolved = 0;
  let newlyFinished = 0;

  for (const f of fixtures) {
    const hc = codeOf(f.homeName);
    const ac = codeOf(f.awayName);

    // 1) passendes Spiel finden
    let m: OurMatch | undefined;
    let resolveTeams = false;
    if (hc && ac) {
      const cands = byPair.get([hc, ac].sort().join("|")) ?? [];
      m =
        cands.length <= 1
          ? cands[0]
          : cands.reduce((b, c) =>
              Math.abs(c.kickoff.getTime() - new Date(f.date).getTime()) <
              Math.abs(b.kickoff.getTime() - new Date(f.date).getTime())
                ? c
                : b,
            );
    }
    if (!m) {
      // K.-o.-Platzhalter über exakte Anpfiff-Zeit zuordnen
      const cands = koByTime.get(new Date(f.date).getTime()) ?? [];
      m = cands[0];
      if (m && hc && ac) resolveTeams = true;
    }
    if (!m) continue;

    // Collect apiTeamId for matched teams (for squad lookups)
    if (hc && f.homeTeamId) {
      const t = teamByCode.get(hc);
      if (t && !t.apiTeamId && !pendingApiTeamIds.has(t.id)) pendingApiTeamIds.set(t.id, f.homeTeamId);
    }
    if (ac && f.awayTeamId) {
      const t = teamByCode.get(ac);
      if (t && !t.apiTeamId && !pendingApiTeamIds.has(t.id)) pendingApiTeamIds.set(t.id, f.awayTeamId);
    }

    const data: Record<string, unknown> = {};

    // 2) apiFixtureId merken
    if (f.fixtureId && m.apiFixtureId !== String(f.fixtureId)) data.apiFixtureId = String(f.fixtureId);

    // 3) K.-o.-Paarung auflösen (Platzhalter -> echte Teams)
    if (resolveTeams && PHASE_META[m.phase as Phase]?.knockout) {
      const homeId = teamIdByCode.get(hc!);
      const awayId = teamIdByCode.get(ac!);
      if (homeId && awayId) {
        data.homeTeamId = homeId;
        data.awayTeamId = awayId;
        data.homePlaceholder = null;
        data.awayPlaceholder = null;
        resolved++;
      }
    }

    // 4) Stadion/Stadt nachfüllen, falls leer
    if (f.venue && !m.venue) data.venue = f.venue;
    if (f.city && !m.city) data.city = f.city;

    // 5) Stand/Status übernehmen (beendete Spiele nie zurückstufen)
    const status = LIVE.has(f.status) ? "live" : FINISHED.has(f.status) ? "finished" : null;
    if (status && !(m.status === "finished" && status !== "finished")) {
      checked++;
      // gerade aufgelöst -> wir haben Heim = hc gesetzt, also gleiche Orientierung
      const sameOrient = data.homeTeamId ? true : m.homeTeam?.code === hc;
      const hg = sameOrient ? f.homeGoals : f.awayGoals;
      const ag = sameOrient ? f.awayGoals : f.homeGoals;
      // Sieger: Gruppenspiele haben nie einen Sieger bei Unentschieden –
      // API gibt manchmal fälschlich winner=true zurück. Daher: Gruppenspiele
      // immer aus den Toren ableiten; K.-o.-Spiele aus dem API-Feld.
      const isKnockout = !!PHASE_META[m.phase as Phase]?.knockout;
      const apiWinner =
        f.homeWinner === true
          ? sameOrient ? "HOME" : "AWAY"
          : f.awayWinner === true
            ? sameOrient ? "AWAY" : "HOME"
            : null;
      const goalsWinner =
        hg != null && ag != null
          ? hg > ag ? "HOME" : ag > hg ? "AWAY" : null
          : null;
      const winner = isKnockout ? apiWinner : goalsWinner;
      data.status = status;
      if (hg != null) data.homeGoals = hg;
      if (ag != null) data.awayGoals = ag;
      // Immer schreiben (auch null), damit falsch gesetzte winner-Felder
      // beim nächsten Sync selbst korrigiert werden.
      data.winner = winner;
      // Abschlussart + Elfmeterschießen-Stand (gleiche Orientierung wie die Tore).
      if (status === "finished") {
        data.apiStatus = f.status;
        data.homePenalties = sameOrient ? f.homePenalties : f.awayPenalties;
        data.awayPenalties = sameOrient ? f.awayPenalties : f.homePenalties;
      }
    }

    if (Object.keys(data).length === 0) continue;

    try {
      await db.match.update({ where: { id: m.id }, data });
      if (data.status) updated++;
      if (data.status === "live") live++;
      if (data.status === "finished" && m.status !== "finished") newlyFinished++;
    } catch {
      /* z. B. apiFixtureId-Kollision -> ignorieren */
    }
  }

  // Save API team IDs for squad lookups (fire-and-forget, non-critical)
  for (const [id, apiTeamId] of pendingApiTeamIds) {
    await db.team.update({ where: { id }, data: { apiTeamId } }).catch(() => {});
    // Mark in-memory so subsequent calls within this run don't re-queue
    const t = teams.find((x) => x.id === id);
    if (t) t.apiTeamId = apiTeamId;
  }

  return { ok: true, updated, live, checked, resolved, newlyFinished };
}
