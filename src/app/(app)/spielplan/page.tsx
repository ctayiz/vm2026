import { requireUser } from "@/lib/auth";
import {
  getMatches,
  getUserStats,
  getFavoriteTeams,
  buildFavoritesOverview,
  type MatchWithPrediction,
} from "@/lib/queries";
import { db } from "@/lib/db";
import { MatchCard } from "@/components/match-card";
import { FeaturedMatch } from "@/components/featured-match";
import { DashboardHero } from "@/components/dashboard-hero";
import { FavoritesStrip } from "@/components/favorites-strip";
import { FilterBar } from "@/components/filter-bar";
import { TeamFilter, type TeamFilterOption } from "@/components/team-filter";
import { Flag } from "@/components/flag";
import { dayKey, dayLabel } from "@/lib/format";
import { isPickLocked, msUntilLock } from "@/lib/lock";
import { PHASE_META, type Phase } from "@/lib/constants";
import { CalendarDays, Star, AlarmClock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "alle", label: "Alle Spiele" },
  { value: "favoriten", label: "⭐ Favoriten" },
  { value: "offen", label: "Meine offenen Tipps" },
  { value: "gruppe", label: "Gruppenphase" },
  { value: "ko", label: "K.-o.-Phase" },
];

function applyFilter(matches: MatchWithPrediction[], filter: string, favoriteCodes: string[]) {
  switch (filter) {
    case "favoriten":
      return matches.filter(
        (m) =>
          (m.homeTeam && favoriteCodes.includes(m.homeTeam.code)) ||
          (m.awayTeam && favoriteCodes.includes(m.awayTeam.code)),
      );
    case "offen":
      return matches.filter(
        (m) => m.status !== "finished" && !isPickLocked(m.kickoff) && !m.myPrediction,
      );
    case "gruppe":
      return matches.filter((m) => m.phase === "GROUP");
    case "ko":
      return matches.filter((m) => PHASE_META[m.phase as Phase]?.knockout);
    default:
      return matches;
  }
}

function applyTeamFilter(matches: MatchWithPrediction[], teamCode: string) {
  if (!teamCode) return matches;
  return matches.filter(
    (m) => m.homeTeam?.code === teamCode || m.awayTeam?.code === teamCode,
  );
}

export default async function SpielplanPage({
  searchParams,
}: {
  searchParams: { filter?: string; team?: string };
}) {
  const user = await requireUser();
  const [all, stats, teams, favoriteTeams] = await Promise.all([
    getMatches(user.id),
    getUserStats(user.id),
    db.team.findMany({
      orderBy: [{ group: "asc" }, { name: "asc" }],
      select: { code: true, name: true, flagCode: true, group: true },
    }),
    getFavoriteTeams(user.id),
  ]);
  const favoriteCodes = favoriteTeams.map((t) => t.code);
  const favoritesOverview = buildFavoritesOverview(favoriteCodes, all);

  // Phasen, in denen der Joker bereits auf einem gesperrten Spiel sitzt
  const lockedJokerPhases = new Set(
    all.filter((m) => m.myJoker && isPickLocked(m.kickoff)).map((m) => m.phase),
  );

  const filter = searchParams.filter ?? "alle";
  const teamCode = searchParams.team ?? "";
  const selectedTeam = teamCode ? teams.find((t) => t.code === teamCode) ?? null : null;
  const matches = applyTeamFilter(applyFilter(all, filter, favoriteCodes), teamCode);

  const now = Date.now();
  // nächstes anstehendes Spiel (noch nicht beendet, Anpfiff in der Zukunft)
  const nextMatch =
    all.find((m) => m.status !== "finished" && m.kickoff.getTime() > now) ?? null;
  const openCount = all.filter(
    (m) => m.status !== "finished" && !isPickLocked(m.kickoff) && !m.myPrediction,
  ).length;

  // Erinnerung: ungetippte Spiele, deren Tipp-Schluss in < 60 Min ist
  const HOUR = 60 * 60 * 1000;
  const closingSoon = all.filter((m) => {
    if (m.status === "finished" || m.myPrediction) return false;
    const ms = msUntilLock(m.kickoff);
    return ms > 0 && ms <= HOUR;
  }).length;

  // nach Tag gruppieren (chronologisch)
  const byDay = new Map<string, MatchWithPrediction[]>();
  for (const m of matches) {
    const k = dayKey(m.kickoff);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(m);
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <DashboardHero
        name={user.displayName}
        points={stats.totalPoints}
        rank={stats.rank}
        totalPlayers={stats.totalPlayers}
        openCount={openCount}
      />

      {closingSoon > 0 && (
        <Link
          href="/spielplan?filter=offen"
          className="flex animate-glow-pulse items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-3 text-sm transition-colors hover:bg-amber-400/15"
        >
          <AlarmClock className="size-4 text-amber-300" />
          <span>
            <span className="font-semibold text-amber-300">Tipp-Schluss bald!</span> {closingSoon}{" "}
            {closingSoon === 1 ? "Spiel schließt" : "Spiele schließen"} in der nächsten Stunde – jetzt
            tippen.
          </span>
        </Link>
      )}

      {favoritesOverview.length > 0 ? (
        <FavoritesStrip items={favoritesOverview} />
      ) : (
        <Link
          href="/profil#favoriten"
          className="flex items-center gap-2 rounded-xl border border-dashed border-amber-400/40 bg-amber-400/5 px-4 py-3 text-sm transition-colors hover:bg-amber-400/10"
        >
          <Star className="size-4 text-amber-300" />
          <span>
            Wähle bis zu 3 <span className="font-semibold">Lieblingsländer</span> – sie bekommen hier
            oben mehr Fokus.
          </span>
        </Link>
      )}

      {nextMatch && (
        <section className="space-y-3">
          <FeaturedMatch match={nextMatch} />
        </section>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />
          <h2 className="text-lg font-bold">Spielplan</h2>
          <span className="text-sm text-muted-foreground">· {all.length} Spiele (Europe/Berlin)</span>
        </div>
        <FilterBar options={FILTERS} />
        <TeamFilter teams={teams as TeamFilterOption[]} />
      </div>

      {selectedTeam && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm">
          <Flag code={selectedTeam.flagCode} className="text-xl" />
          <span>
            Spiele von <span className="font-semibold">{selectedTeam.name}</span> · {matches.length}{" "}
            {matches.length === 1 ? "Spiel" : "Spiele"}
          </span>
        </div>
      )}

      {days.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {selectedTeam
            ? `Keine Spiele für ${selectedTeam.name} in dieser Ansicht. K.-o.-Spiele erscheinen erst, sobald die Teams feststehen.`
            : filter === "offen"
              ? "Keine offenen Tipps – du hast für alle anstehenden Spiele getippt. Stark!"
              : filter === "favoriten"
                ? favoriteCodes.length === 0
                  ? "Du hast noch keine Lieblingsländer gewählt – im Profil festlegen."
                  : "Keine Spiele deiner Favoriten in dieser Ansicht."
                : "Keine Spiele gefunden. Bitte als Admin den Spielplan synchronisieren."}
        </p>
      ) : (
        days.map(([k, dayMatches]) => (
          <section key={k} className="space-y-3">
            <h2 className="sticky top-14 z-10 -mx-1 bg-background/80 px-1 py-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
              {dayLabel(dayMatches[0].kickoff)}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {dayMatches.map((m, i) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  index={i}
                  favoriteCodes={favoriteCodes}
                  joker
                  phaseJokerLocked={lockedJokerPhases.has(m.phase)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
