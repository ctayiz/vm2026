import { NextResponse } from "next/server";
import { fetchFixtureDetail, hasApiFootball } from "@/lib/api-football";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

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
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "?id= fehlt" });
  try {
    const d = await fetchFixtureDetail(id);
    if (!d) return NextResponse.json({ ok: false, error: "kein Fixture" });
    return NextResponse.json({
      ok: true,
      status: d.statusShort,
      score: `${d.goalsHome}:${d.goalsAway}`,
      referee: d.referee,
      venue: d.venue,
      events: d.events.length,
      lineups: d.lineups.map((l) => ({ team: l.teamName, formation: l.formation, xi: l.startXI.length, subs: l.substitutes.length, coach: l.coach })),
      statTeams: d.statistics.length,
      sampleStats: d.statistics[0]?.stats.slice(0, 5),
      sampleEvents: d.events.slice(0, 3).map((e) => `${e.minute}' ${e.type}/${e.detail} ${e.playerName}`),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Fehler" });
  }
}
