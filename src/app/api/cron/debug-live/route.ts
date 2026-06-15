import { NextResponse } from "next/server";
import { fetchFixtures, fetchLiveFixtures } from "@/lib/api-football";

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
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const [all, live] = await Promise.all([fetchFixtures(), fetchLiveFixtures()]);
  const liveIds = live.map((f) => f.fixtureId);
  // Spiele die laut DB laufen könnten (im Zeitfenster)
  const now = Date.now();
  const recent = all.filter((f) => {
    const t = new Date(f.date).getTime();
    return t <= now && t >= now - 3 * 60 * 60 * 1000;
  });
  return NextResponse.json({
    liveCount: live.length,
    liveIds,
    recentFixtures: recent.map((f) => ({
      id: f.fixtureId,
      home: f.homeName,
      away: f.awayName,
      status: f.status,
      date: f.date,
      isInLive: liveIds.includes(f.fixtureId),
    })),
  });
}
