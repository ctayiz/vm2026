import { db } from "./db";
import { fetchTopScorers, fetchFixtures, fetchFixtureGoals, hasApiFootball } from "./api-football";
import { lookupTeam } from "./team-map";

// API-Football nutzt teils andere Namen für Nationalteams -> auf unsere Keys mappen.
const TEAM_ALIASES: Record<string, string> = {
  "Korea Republic": "South Korea",
  "United States": "USA",
  "IR Iran": "Iran",
  "Cote d'Ivoire": "Ivory Coast",
  "Côte d'Ivoire": "Ivory Coast",
  "Czechia": "Czech Republic",
  "Turkiye": "Turkey",
  "Türkiye": "Turkey",
  "Cabo Verde": "Cape Verde",
  "DR Congo": "DR Congo",
};

async function teamIdByApiName(name: string | null, codeIndex: Map<string, string>): Promise<string | null> {
  if (!name) return null;
  const info = lookupTeam(TEAM_ALIASES[name] ?? name);
  if (!info) return null;
  return codeIndex.get(info.code) ?? null;
}

async function loadCodeIndex(): Promise<Map<string, string>> {
  const teams = await db.team.findMany({ select: { id: true, code: true } });
  return new Map(teams.map((t) => [t.code, t.id]));
}

export interface ScorerSyncSummary {
  ok: boolean;
  message: string;
  players?: number;
}

/**
 * Torschützenliste von API-Football laden und Spieler aktualisieren.
 * Markiert den/die Spieler mit den meisten Toren als Torschützenkönig.
 */
export async function syncTopScorers(): Promise<ScorerSyncSummary> {
  if (!hasApiFootball()) {
    return { ok: false, message: "Kein APIFOOTBALL_KEY gesetzt." };
  }
  try {
    const scorers = await fetchTopScorers();
    const codeIndex = await loadCodeIndex();

    for (const s of scorers) {
      const teamId = await teamIdByApiName(s.teamName, codeIndex);
      await db.player.upsert({
        where: { externalId: s.externalId },
        update: { name: s.name, goals: s.goals, assists: s.assists, photo: s.photo, teamId },
        create: { externalId: s.externalId, name: s.name, goals: s.goals, assists: s.assists, photo: s.photo, teamId },
      });
    }

    // Torschützenkönig(e) markieren = höchste Toranzahl > 0
    const max = scorers.reduce((m, s) => Math.max(m, s.goals), 0);
    await db.player.updateMany({ data: { isTopScorer: false } });
    if (max > 0) {
      await db.player.updateMany({ where: { goals: max }, data: { isTopScorer: true } });
    }

    return { ok: true, message: `${scorers.length} Torschützen aktualisiert.`, players: scorers.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler beim Abruf.";
    return { ok: false, message: msg };
  }
}

/**
 * Spiel-Events (Tore) von API-Football laden. Matcht Fixtures über Team-Codes,
 * speichert apiFixtureId und die Torschützen je Spiel. Nur für abgeschlossene,
 * noch nicht erfasste Spiele -> spart API-Aufrufe.
 */
export async function syncMatchGoals(): Promise<ScorerSyncSummary> {
  if (!hasApiFootball()) {
    return { ok: false, message: "Kein APIFOOTBALL_KEY gesetzt." };
  }
  try {
    const fixtures = await fetchFixtures();
    const codeIndex = await loadCodeIndex();
    const ourMatches = await db.match.findMany({
      include: { homeTeam: true, awayTeam: true, goals: { select: { id: true, playerId: true } } },
    });

    let goalCount = 0;
    for (const fx of fixtures) {
      const homeId = await teamIdByApiName(fx.homeName, codeIndex);
      const awayId = await teamIdByApiName(fx.awayName, codeIndex);
      if (!homeId || !awayId) continue;

      const match = ourMatches.find(
        (m) => m.homeTeamId === homeId && m.awayTeamId === awayId,
      );
      if (!match) continue;

      // Fixture-ID merken
      if (match.apiFixtureId !== String(fx.fixtureId)) {
        await db.match.update({ where: { id: match.id }, data: { apiFixtureId: String(fx.fixtureId) } });
      }

      // nur abgeschlossene Spiele, bei denen noch keine (oder unvollständig verlinkte) Tore vorliegen
      const finished = ["FT", "AET", "PEN"].includes(fx.status);
      const hasUnlinkedGoals = match.goals.some((g) => g.playerId === null);
      if (!finished || (match.goals.length > 0 && !hasUnlinkedGoals)) continue;

      const events = await fetchFixtureGoals(fx.fixtureId);
      for (const ev of events) {
        const teamId = await teamIdByApiName(ev.teamName, codeIndex);

        // Spieler anlegen/aktualisieren – auch wenn noch nicht im Top-Scorer-Endpunkt
        let playerId: string | null = null;
        if (ev.playerExternalId && ev.type !== "own") {
          const p = await db.player.upsert({
            where: { externalId: ev.playerExternalId },
            update: { name: ev.playerName, teamId: teamId ?? undefined },
            create: { externalId: ev.playerExternalId, name: ev.playerName, teamId },
          });
          playerId = p.id;
        }

        await db.goal.upsert({
          where: { externalId: ev.externalId },
          update: { playerName: ev.playerName, minute: ev.minute, type: ev.type, teamId, playerId },
          create: {
            externalId: ev.externalId,
            matchId: match.id,
            playerName: ev.playerName,
            minute: ev.minute,
            type: ev.type,
            teamId,
            playerId,
          },
        });
        goalCount++;
      }
    }

    // Toranzahl für alle verlinkten Spieler aus den gespeicherten Events neu berechnen.
    // Eigentore (type="own") zählen nicht für den Schützen.
    const counts = await db.goal.groupBy({
      by: ["playerId"],
      where: { playerId: { not: null }, type: { not: "own" } },
      _count: { id: true },
    });
    for (const { playerId, _count } of counts) {
      if (playerId) await db.player.update({ where: { id: playerId }, data: { goals: _count.id } });
    }

    // isTopScorer aktualisieren
    const maxGoals = counts.reduce((m, c) => Math.max(m, c._count.id), 0);
    await db.player.updateMany({ data: { isTopScorer: false } });
    if (maxGoals > 0) {
      await db.player.updateMany({ where: { goals: maxGoals }, data: { isTopScorer: true } });
    }

    return { ok: true, message: `${goalCount} Tore aus Live-Daten erfasst.` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler beim Abruf.";
    return { ok: false, message: msg };
  }
}
