// Spielplan-Datenquelle – bewusst gekapselt, damit später leicht austauschbar.
//
// Reihenfolge:
//   1. API-Football / API-Sports  (wenn APIFOOTBALL_KEY gesetzt) – Stub, erweiterbar
//   2. OpenFootball JSON          (WORLDCUP_JSON_URL)
//   3. Eingebauter Offline-Datensatz (buildSchedule) als garantierter Fallback
//
// Alle Quellen liefern denselben normalisierten Typ `NormalizedMatch`.

import { buildSchedule, type NormalizedMatch, type NormalizedTeamRef } from "./worldcup-data";
import { lookupTeam, translatePlaceholder } from "./team-map";
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

/** Echtes Team -> NormalizedTeamRef, Platzhalter -> übersetzter String. */
function resolveSide(token: string | undefined): { team?: NormalizedTeamRef; placeholder?: string } {
  if (!token) return {};
  const info = lookupTeam(token);
  if (info) return { team: { code: info.code, name: info.name, flagCode: info.flagCode } };
  return { placeholder: translatePlaceholder(token) };
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

/**
 * Lädt den Spielplan. Wirft NICHT bei Netzwerkfehlern, sondern fällt auf den
 * eingebauten Datensatz zurück (für ein robustes MVP-Erlebnis).
 */
export async function fetchSchedule(): Promise<SyncResult> {
  // 1) API-Football – Platzhalter für späteren Ausbau.
  if (process.env.APIFOOTBALL_KEY) {
    // Hier würde der API-Football-Client implementiert (siehe README, Abschnitt
    // "Datenquelle austauschen"). Vorerst absichtlich nicht aktiv -> nächste Quelle.
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
          return { source: "openfootball", matches };
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
