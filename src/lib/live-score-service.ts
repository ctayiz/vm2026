// Live-Ergebnisse von API-Football (api-sports.io) in unsere DB übernehmen.
//
// football-data.org liefert im Gratis-Tarif keine Live-Stände (Status bleibt
// "TIMED" bis lange nach Abpfiff). API-Football liefert sie. Ein einziger Abruf
// (/fixtures?league&season) gibt ALLE Spiele inkl. aktuellem Stand zurück – das
// ist quotaschonend (Free: 100 Abrufe/Tag).
//
// Knackpunkt: Unsere Teams heißen deutsch ("Mexiko"), API-Football englisch
// ("Mexico"). Wir überbrücken das exakt über den FIFA-Code: englischer Name ->
// FIFA-Code -> unser Team. Zugeordnet wird ein Spiel über das (ungeordnete)
// Code-Paar + Datum, damit auch zeitgleiche Gruppenspiele eindeutig matchen.

import { db } from "./db";
import { fetchFixtures, hasApiFootball } from "./api-football";

// API-Football Kurz-Status -> unser Status
const LIVE = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);
const FINISHED = new Set(["FT", "AET", "PEN"]);

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
  IRN: ["iran"],
  NZL: ["newzealand"],
  EGY: ["egypt"],
  CPV: ["capeverde", "capeverdeislands"],
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

/** Normalisiert einen Ländernamen für den Vergleich (klein, ohne Akzente/Sonderzeichen). */
function norm(s: string): string {
  // NFD trennt Akzente in Basiszeichen + kombinierende Marke; der finale
  // [^a-z0-9]-Filter entfernt diese Marken und alle Sonderzeichen/Leerzeichen.
  return s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
}

export type LiveSyncResult = { ok: boolean; updated: number; live: number; checked: number; note?: string };

/**
 * Holt alle Fixtures von API-Football und übernimmt Live-/Endstände in unsere DB.
 * Aktualisiert Status, Tore und (für K.o.) den Sieger. Beendete Spiele werden nie
 * wieder „heruntergestuft". Gibt zurück, wie viele Spiele aktualisiert wurden.
 */
export async function syncLiveScores(): Promise<LiveSyncResult> {
  if (!hasApiFootball()) return { ok: false, updated: 0, live: 0, checked: 0, note: "APIFOOTBALL_KEY fehlt" };

  const fixtures = await fetchFixtures();

  const ours = await db.match.findMany({
    where: { homeTeamId: { not: null }, awayTeamId: { not: null } },
    include: { homeTeam: true, awayTeam: true },
  });

  // Index nach ungeordnetem Code-Paar (z. B. "MEX|RSA")
  const byPair = new Map<string, typeof ours>();
  for (const m of ours) {
    const key = [m.homeTeam!.code, m.awayTeam!.code].sort().join("|");
    const list = byPair.get(key);
    if (list) list.push(m);
    else byPair.set(key, [m]);
  }

  let updated = 0;
  let live = 0;
  let checked = 0;

  for (const f of fixtures) {
    const hc = NAME_TO_CODE.get(norm(f.homeName));
    const ac = NAME_TO_CODE.get(norm(f.awayName));
    if (!hc || !ac) continue; // Team nicht eindeutig zuordenbar -> überspringen

    const candidates = byPair.get([hc, ac].sort().join("|")) ?? [];
    if (candidates.length === 0) continue;
    // bei mehreren (Gruppe + evtl. K.o.-Rückspiel) das datumsnächste nehmen
    const m =
      candidates.length === 1
        ? candidates[0]
        : candidates.reduce((best, c) =>
            Math.abs(c.kickoff.getTime() - new Date(f.date).getTime()) <
            Math.abs(best.kickoff.getTime() - new Date(f.date).getTime())
              ? c
              : best,
          );

    const data: Record<string, unknown> = {};

    // Stadion/Stadt anreichern, wenn die API es liefert und bei uns noch leer ist.
    if (f.venue && !m.venue) data.venue = f.venue;
    if (f.city && !m.city) data.city = f.city;

    // Live-/Endstand übernehmen (beendete Spiele nie wieder zurückstufen).
    const status = LIVE.has(f.status) ? "live" : FINISHED.has(f.status) ? "finished" : null;
    if (status && !(m.status === "finished" && status !== "finished")) {
      checked++;
      // Orientierung anhand des Codes (Heim/Auswärts kann je Quelle abweichen)
      const sameOrient = m.homeTeam!.code === hc;
      const hg = sameOrient ? f.homeGoals : f.awayGoals;
      const ag = sameOrient ? f.awayGoals : f.homeGoals;
      const winner =
        f.homeWinner === true
          ? sameOrient
            ? "HOME"
            : "AWAY"
          : f.awayWinner === true
            ? sameOrient
              ? "AWAY"
              : "HOME"
            : null;
      data.status = status;
      if (hg != null) data.homeGoals = hg;
      if (ag != null) data.awayGoals = ag;
      if (winner) data.winner = winner;
    }

    if (Object.keys(data).length === 0) continue; // nichts zu tun

    await db.match.update({ where: { id: m.id }, data });
    if (data.status) updated++;
    if (data.status === "live") live++;
  }

  return { ok: true, updated, live, checked };
}
