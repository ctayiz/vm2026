import { db } from "./db";
import { fetchSchedule } from "./datasource";
import type { NormalizedMatch, NormalizedTeamRef } from "./worldcup-data";

async function upsertTeam(ref: NormalizedTeamRef, group?: string | null): Promise<string> {
  const team = await db.team.upsert({
    where: { code: ref.code },
    update: {
      name: ref.name,
      ...(ref.flagCode ? { flagCode: ref.flagCode } : {}),
      ...(group ? { group } : {}),
    },
    create: {
      code: ref.code,
      name: ref.name,
      flagCode: ref.flagCode ?? null,
      group: group ?? null,
    },
  });
  return team.id;
}

export interface SyncSummary {
  source: string;
  note?: string;
  teams: number;
  created: number;
  updated: number;
  removed: number;
  total: number;
}

/**
 * Lädt den Spielplan aus der konfigurierten Quelle und schreibt ihn idempotent
 * in die DB (Teams via code, Matches via externalId).
 *
 * Wichtig: Vom Admin eingetragene Ergebnisse werden NICHT überschrieben, wenn die
 * Quelle kein Ergebnis liefert.
 */
export async function syncSchedule(): Promise<SyncSummary> {
  const result = await fetchSchedule();
  const authoritative = result.source === "football-data" || result.source === "api-football";

  // Schutz: Eine Fallback-Quelle (OpenFootball/builtin) darf bereits vorhandene
  // autoritative Daten NICHT überschreiben/löschen. Verhindert, dass z. B. ein
  // Sync ohne FOOTBALLDATA_TOKEN auf Vercel die echten Daten kaputt macht.
  if (!authoritative) {
    const existingAuth = await db.match.count({
      where: { OR: [{ externalId: { startsWith: "fd-" } }, { externalId: { startsWith: "af-" } }] },
    });
    if (existingAuth > 0) {
      return {
        source: result.source,
        note: "Übersprungen: autoritative Daten vorhanden – Fallback-Quelle ignoriert (FOOTBALLDATA_TOKEN auf dem Server setzen!).",
        teams: 0,
        created: 0,
        updated: 0,
        removed: 0,
        total: result.matches.length,
      };
    }
  }

  const teamIds = new Set<string>();
  const syncedExternalIds = new Set<string>();
  let created = 0;
  let updated = 0;
  let removed = 0;

  for (const m of result.matches) {
    syncedExternalIds.add(m.externalId);
    const homeTeamId = m.home ? await upsertTeam(m.home, m.group) : null;
    const awayTeamId = m.away ? await upsertTeam(m.away, m.group) : null;
    if (homeTeamId) teamIds.add(homeTeamId);
    if (awayTeamId) teamIds.add(awayTeamId);

    // Spielstand (auch live) aus der Quelle, falls vorhanden.
    const sourceHasScore = m.homeGoals != null && m.awayGoals != null;
    const srcStatus = m.status; // "scheduled" | "live" | "finished"

    const existing = await db.match.findUnique({
      where: { externalId: m.externalId },
      select: { id: true, status: true },
    });

    // Status bestimmen – ein bereits beendetes Spiel wird NIE zurückgestuft
    // (z. B. wenn die Quelle kurz „scheduled"/„live" zurückmeldet).
    let status: string;
    if (existing?.status === "finished" || srcStatus === "finished") status = "finished";
    else if (srcStatus === "live") status = "live";
    else status = "scheduled";

    const baseData = {
      phase: m.phase,
      group: m.group ?? null,
      roundLabel: m.roundLabel ?? null,
      kickoff: new Date(m.kickoff),
      venue: m.venue ?? null,
      city: m.city ?? null,
      homeTeamId,
      awayTeamId,
      homePlaceholder: m.homePlaceholder ?? null,
      awayPlaceholder: m.awayPlaceholder ?? null,
    };

    // Spielstand nur übernehmen, wenn die Quelle einen liefert – sonst Bestand
    // wahren (überschreibt keine vom Admin eingetragenen Ergebnisse mit null).
    const scoreData = sourceHasScore ? { homeGoals: m.homeGoals, awayGoals: m.awayGoals } : {};

    if (!existing) {
      await db.match.create({
        data: { externalId: m.externalId, ...baseData, status, ...scoreData },
      });
      created++;
    } else {
      await db.match.update({
        where: { externalId: m.externalId },
        data: { ...baseData, status, ...scoreData },
      });
      updated++;
    }
  }

  // Veraltete Spiele aus einer ANDEREN Quelle entfernen (z. B. nach Wechsel
  // OpenFootball -> API-Football). Nur wenn der Import vollständig wirkt
  // (>= 50 Spiele), um bei einem partiellen Abruf nicht versehentlich zu löschen.
  if (result.matches.length >= 50) {
    const del = await db.match.deleteMany({
      where: { externalId: { notIn: [...syncedExternalIds] } },
    });
    removed = del.count;
    // Verwaiste Teams (ohne Spiele) aus alten Quellen/Codes entfernen,
    // damit Favoriten-/Turnier-Picker keine falschen Länder/Gruppen zeigen.
    await db.team.deleteMany({
      where: { homeMatches: { none: {} }, awayMatches: { none: {} } },
    });
  }

  return {
    source: result.source,
    note: result.note,
    teams: teamIds.size,
    created,
    updated,
    removed,
    total: result.matches.length,
  };
}
