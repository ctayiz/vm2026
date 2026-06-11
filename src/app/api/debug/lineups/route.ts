import { NextResponse } from "next/server";
import { fetchFixtures, fetchLineups, hasApiFootball } from "@/lib/api-football";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Temporärer Test-Endpunkt: prüft, ob der API-Football-Tarif Aufstellungen liefert.
 * Geschützt per CRON_SECRET. Optional ?fixture=<id>, sonst wird automatisch ein
 * beendetes/laufendes Spiel gewählt.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const q = new URL(req.url).searchParams.get("secret");
  return auth === `Bearer ${secret}` || q === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!hasApiFootball()) return NextResponse.json({ ok: false, error: "APIFOOTBALL_KEY fehlt" });

  try {
    const url = new URL(req.url);
    let fixtureId = Number(url.searchParams.get("fixture")) || null;
    let pickedFrom = "query";

    const fixtures = await fetchFixtures();
    if (!fixtureId) {
      // bevorzugt laufendes, sonst zuletzt beendetes Spiel
      const live = fixtures.find((f) => ["1H", "HT", "2H", "ET", "P"].includes(f.status));
      const finished = [...fixtures].reverse().find((f) => ["FT", "AET", "PEN"].includes(f.status));
      const pick = live ?? finished ?? fixtures[0];
      fixtureId = pick?.fixtureId ?? null;
      pickedFrom = live ? "live" : finished ? "finished" : "first";
    }
    if (!fixtureId) return NextResponse.json({ ok: false, error: "kein Fixture gefunden" });

    const lineups = await fetchLineups(fixtureId);
    return NextResponse.json({
      ok: true,
      fixtureId,
      pickedFrom,
      teamsWithLineup: lineups.length,
      hasData: lineups.length > 0 && lineups[0].startXI.length > 0,
      summary: lineups.map((l) => ({
        team: l.teamName,
        formation: l.formation,
        coach: l.coach,
        startXI: l.startXI.length,
        subs: l.substitutes.length,
      })),
      sampleXI: lineups[0]?.startXI.slice(0, 4) ?? [],
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Fehler" });
  }
}
