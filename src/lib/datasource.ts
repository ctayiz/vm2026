// Spielplan-Datenquelle – bewusst gekapselt, damit leicht austauschbar.
//
// Reihenfolge (erste verfügbare gewinnt):
//   1. API-Football / API-Sports  (wenn APIFOOTBALL_KEY gesetzt) – AUTORITATIV + LIVE
//      echte Auslosung, Anstoßzeiten, Ergebnisse, Status.
//   2. OpenFootball JSON          (WORLDCUP_JSON_URL) – Community, ggf. PROVISORISCH
//   3. Eingebauter Offline-Datensatz (buildSchedule) – nur Notfall-Fallback
//
// Alle Quellen liefern denselben normalisierten Typ `NormalizedMatch`.

import { buildSchedule, type NormalizedMatch, type NormalizedTeamRef } from "./worldcup-data";
import { lookupTeam, resolveTeamRef } from "./team-map";
import { hasApiFootball, fetchFixtures, type ApiFixture } from "./api-football";
import type { Phase } from "./constants";

export interface SyncResult {
  source: "api-football" | "openfootball" | "builtin";
  matches: NormalizedMatch[];
  note?: string;
}

/** Mappt OpenFootball-Rundenbezeichnungen auf Phase + deutsches Label. */
function mapRound(round: string | undefined, group?: string): { phase: Phase; label: string } {
  if (group) return { phase: "GROUP", label: `Gruppe ${group}` };
  const s = (round ?? "").toLowerCase();
  if (s.includes("third") || s.includes("3rd") || s.includes("platz"))
    return { phase: "TP", label: "Spiel um Platz 3" };
  if (s.includes("final") && !s.includes("semi") && !s.includes("quarter"))
    return { phase: "FINAL", label: "Finale" };
  if (s.includes("semi")) return { phase: "SF", label: "Halbfinale" };
  if (s.includes("quarter")) return { phase: "QF", label: "Viertelfinale" };
  if (s.includes("16")) return { phase: "R16", label: "Achtelfinale" };
  if (s.includes("32")) return { phase: "R32", label: "Runde der letzten 32" };
  return { phase: "GROUP", label: round ?? "Gruppenphase" };
}

/** "13:00 UTC-6" + "2026-06-11" -> ISO (UTC). Robust ggü. Offsets. */
function parseKickoff(date: string | undefined, time: string | undefined): string {
  if (!date) return new Date().toISOString();
  const m = /^(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})(?::?(\d{2}))?/.exec((time ?? "").trim());
  if (!m) {
    // Fallback: Zeit ohne Offset -> als UTC interpretieren
    const hhmm = (time ?? "18:00").slice(0, 5);
    return new Date(`${date}T${hhmm}:00Z`).toISOString();
  }
  const [, hh, mm, offH, offM] = m;
  const sign = offH.startsWith("-") ? "-" : "+";
  const oh = String(Math.abs(parseInt(offH, 10))).padStart(2, "0");
  const om = (offM ?? "00").padStart(2, "0");
  return new Date(`${date}T${hh.padStart(2, "0")}:${mm}:00${sign}${oh}:${om}`).toISOString();
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Echtes Team -> NormalizedTeamRef, sonst roher Platzhalter-Token (z. B. "2A"). */
function resolveSide(token: string | undefined): { team?: NormalizedTeamRef; placeholder?: string } {
  if (!token) return {};
  const info = lookupTeam(token);
  if (info) return { team: { code: info.code, name: info.name, flagCode: info.flagCode } };
  return { placeholder: token.trim() };
}

/**
 * Normalisierung des echten OpenFootball-WM-2026-Formats:
 *  - flaches `matches`-Array (oder älteres `rounds`-Format)
 *  - team1/team2 als Strings (echte Teams ODER Platzhalter "1A", "W73", "3A/B/…")
 *  - `time` mit UTC-Offset, `group` "Group A", `ground` als Ort
 */
function normalizeOpenFootball(json: any): NormalizedMatch[] {
  // beide möglichen Formate auf eine flache Liste bringen
  const flat: any[] = Array.isArray(json?.matches)
    ? json.matches
    : (json?.rounds ?? json?.stages?.flatMap((s: any) => s.rounds ?? []) ?? []).flatMap(
        (r: any) => (r?.matches ?? []).map((m: any) => ({ round: r?.name, ...m })),
      );

  return flat.map((m) => {
    // team1/2 können String oder { name } sein
    const t1 = typeof m.team1 === "string" ? m.team1 : m.team1?.name;
    const t2 = typeof m.team2 === "string" ? m.team2 : m.team2?.name;
    const group = (m.group ?? "").replace(/^Group\s+/i, "").trim() || undefined;
    const { phase, label } = mapRound(m.round, group);

    const home = resolveSide(t1);
    const away = resolveSide(t2);

    // Stabile externalId: per num (K.o.) sonst aus Gruppe + Teams.
    const externalId =
      m.num != null
        ? `wc2026-${m.num}`
        : `wc2026-${group ? "g-" + group : slug(m.round ?? "ko")}-${slug(t1 ?? "?")}-${slug(t2 ?? "?")}`;

    const score = m.score ?? {};
    const ft = Array.isArray(score.ft) ? score.ft : null;

    return {
      externalId,
      phase,
      group,
      roundLabel: label,
      kickoff: parseKickoff(m.date, m.time),
      venue: m.ground ?? m.stadium?.name ?? m.stadium ?? undefined,
      city: undefined,
      home: home.team,
      away: away.team,
      homePlaceholder: home.placeholder,
      awayPlaceholder: away.placeholder,
      status: ft ? "finished" : "scheduled",
      homeGoals: ft ? ft[0] : null,
      awayGoals: ft ? ft[1] : null,
    } satisfies NormalizedMatch;
  });
}

export { normalizeOpenFootball };

// --- API-Football (autoritativ, live) --------------------------------------

/** API-Football-Rundenbezeichnung -> Phase + Gruppe (falls Gruppenphase). */
function mapApiRound(round: string): { phase: Phase; group?: string; label: string } {
  const s = (round ?? "").toLowerCase();
  const groupMatch = /group\s+([a-l])/i.exec(round ?? "");
  if (s.includes("group") || groupMatch) {
    const g = groupMatch?.[1]?.toUpperCase();
    return { phase: "GROUP", group: g, label: g ? `Gruppe ${g}` : "Gruppenphase" };
  }
  if (s.includes("3rd") || s.includes("third")) return { phase: "TP", label: "Spiel um Platz 3" };
  if (s.includes("final") && !s.includes("semi") && !s.includes("quarter"))
    return { phase: "FINAL", label: "Finale" };
  if (s.includes("semi")) return { phase: "SF", label: "Halbfinale" };
  if (s.includes("quarter")) return { phase: "QF", label: "Viertelfinale" };
  if (s.includes("16")) return { phase: "R16", label: "Achtelfinale" };
  if (s.includes("32")) return { phase: "R32", label: "Runde der letzten 32" };
  return { phase: "R16", label: round || "K.-o.-Phase" };
}

function mapApiStatus(short: string): "scheduled" | "live" | "finished" {
  if (["FT", "AET", "PEN", "WO", "AWD"].includes(short)) return "finished";
  if (["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT", "SUSP"].includes(short)) return "live";
  return "scheduled";
}

function normalizeApiFootball(fixtures: ApiFixture[]): NormalizedMatch[] {
  return fixtures.map((f) => {
    const { phase, group, label } = mapApiRound(f.round);
    const status = mapApiStatus(f.status);
    const hasScore = (status === "finished" || status === "live") && f.homeGoals != null && f.awayGoals != null;
    return {
      externalId: `af-${f.fixtureId}`,
      phase,
      group,
      roundLabel: label,
      kickoff: f.date, // API-Football liefert ISO inkl. Offset
      venue: f.venue ?? undefined,
      city: f.city ?? undefined,
      home: resolveTeamRef(f.homeName) as NormalizedTeamRef | undefined,
      away: resolveTeamRef(f.awayName) as NormalizedTeamRef | undefined,
      status,
      homeGoals: hasScore ? f.homeGoals : null,
      awayGoals: hasScore ? f.awayGoals : null,
    } satisfies NormalizedMatch;
  });
}

/** OpenFootball laden + normalisieren (oder null bei Fehler/ohne URL). */
async function fetchOpenFootball(): Promise<NormalizedMatch[] | null> {
  const url = process.env.WORLDCUP_JSON_URL;
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return normalizeOpenFootball(await res.json());
  } catch {
    return null;
  }
}

/**
 * Reichert K.-o.-Spiele OHNE feststehende Teams mit Bracket-Platzhaltern aus
 * OpenFootball an (z. B. „Sieger Gruppe A", „Dritter (Gruppe …)", „Sieger Spiel 73").
 * Zuordnung über die exakte Anstoßzeit (beide Quellen identisch).
 */
async function enrichKnockoutPlaceholders(target: NormalizedMatch[]): Promise<void> {
  const of = await fetchOpenFootball();
  if (!of) return;
  const byKickoff = new Map<number, { home?: string; away?: string }>();
  for (const m of of) {
    if (m.phase === "GROUP") continue;
    if (!m.homePlaceholder && !m.awayPlaceholder) continue;
    byKickoff.set(new Date(m.kickoff).getTime(), {
      home: m.homePlaceholder,
      away: m.awayPlaceholder,
    });
  }
  for (const m of target) {
    if (m.phase === "GROUP" || m.home || m.away) continue; // Teams stehen schon fest
    const p = byKickoff.get(new Date(m.kickoff).getTime());
    if (p) {
      m.homePlaceholder = p.home;
      m.awayPlaceholder = p.away;
    }
  }
}

/**
 * Lädt den Spielplan. Wirft NICHT bei Netzwerkfehlern, sondern fällt auf den
 * eingebauten Datensatz zurück (für ein robustes MVP-Erlebnis).
 */
export async function fetchSchedule(): Promise<SyncResult> {
  // 1) API-Football (autoritativ + live) – einzige echte Quelle (Saison 2026 = Bezahlplan).
  if (hasApiFootball()) {
    try {
      const fixtures = await fetchFixtures();
      const matches = normalizeApiFootball(fixtures);
      if (matches.length > 0) {
        await enrichKnockoutPlaceholders(matches); // Bracket-Platzhalter ergänzen
        return { source: "api-football", matches };
      }
    } catch {
      // bei API-Fehler/Limit: auf nächste Quelle ausweichen
    }
  }

  // 2) OpenFootball JSON
  const url = process.env.WORLDCUP_JSON_URL;
  if (url) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const matches = normalizeOpenFootball(json);
        if (matches.length > 0) {
          return {
            source: "openfootball",
            matches,
            note: "Achtung: OpenFootball ist eine Community-Quelle und für 2026 evtl. provisorisch (vorläufige Auslosung, keine Live-Ergebnisse). Für echte/aktuelle Daten APIFOOTBALL_KEY setzen.",
          };
        }
      }
    } catch {
      // ignorieren -> Fallback
    }
  }

  // 3) Eingebauter Datensatz
  return {
    source: "builtin",
    matches: buildSchedule(),
    note: "Externe Quelle nicht verfügbar/leer – eingebauter Spielplan verwendet.",
  };
}
