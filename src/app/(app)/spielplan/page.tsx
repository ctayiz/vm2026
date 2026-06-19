import { requireUser } from "@/lib/auth";
import {
  getMatches,
  getFavoriteTeams,
  buildFavoritesOverview,
  getGroupStandings,
  type MatchWithPrediction,
} from "@/lib/queries";
import { db } from "@/lib/db";
import { MatchCard } from "@/components/match-card";
import { FeaturedMatch } from "@/components/featured-match";
import { DashboardHero } from "@/components/dashboard-hero";
import { FavoritesStrip } from "@/components/favorites-strip";
import { ExploreTiles } from "@/components/explore-tiles";
import { FilterBar } from "@/components/filter-bar";
import { TeamFilter, type TeamFilterOption } from "@/components/team-filter";
import { GroupTable } from "@/components/group-table";
import { Flag } from "@/components/flag";
import { dayKey, dayLabel } from "@/lib/format";
import { isPickLocked, msUntilLock } from "@/lib/lock";
import { PHASE_META, MAX_JOKERS, type Phase } from "@/lib/constants";
import { getLocale, getDictionary } from "@/lib/i18n-server";
import { CalendarDays, Star, AlarmClock, Goal, Shield, Layers, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";

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
  const t = getDictionary();
  const locale = getLocale();
  const FILTERS = [
    { value: "alle", label: t.schedule.fAll },
    { value: "favoriten", label: t.schedule.fFav },
    { value: "offen", label: t.schedule.fOpen },
    { value: "gruppe", label: t.schedule.fGroup },
    { value: "ko", label: t.schedule.fKo },
  ];

  const [all, teams, favoriteTeams, topScorers, finishedMatches, groupStandings] = await Promise.all([
    getMatches(user.id),
    db.team.findMany({
      orderBy: [{ group: "asc" }, { name: "asc" }],
      select: { code: true, name: true, flagCode: true, group: true },
    }),
    getFavoriteTeams(user.id),
    db.player.findMany({
      where: { goals: { gt: 0 } },
      orderBy: [{ goals: "desc" }, { assists: "desc" }, { name: "asc" }],
      take: 3,
      include: { team: { select: { name: true, flagCode: true } } },
    }),
    db.match.findMany({
      where: { status: "finished" },
      select: {
        homeGoals: true,
        awayGoals: true,
        homeTeam: { select: { code: true, name: true, flagCode: true } },
        awayTeam: { select: { code: true, name: true, flagCode: true } },
      },
    }),
    getGroupStandings(),
  ]);

  // Top-3-Teams nach erzielten Toren
  const teamGoalsMap = new Map<string, { name: string; flagCode: string | null; goals: number }>();
  for (const m of finishedMatches) {
    if (m.homeTeam && m.homeGoals != null) {
      const prev = teamGoalsMap.get(m.homeTeam.code) ?? { name: m.homeTeam.name, flagCode: m.homeTeam.flagCode, goals: 0 };
      teamGoalsMap.set(m.homeTeam.code, { ...prev, goals: prev.goals + m.homeGoals });
    }
    if (m.awayTeam && m.awayGoals != null) {
      const prev = teamGoalsMap.get(m.awayTeam.code) ?? { name: m.awayTeam.name, flagCode: m.awayTeam.flagCode, goals: 0 };
      teamGoalsMap.set(m.awayTeam.code, { ...prev, goals: prev.goals + m.awayGoals });
    }
  }
  const topTeams = [...teamGoalsMap.values()].sort((a, b) => b.goals - a.goals).slice(0, 3);

  // Nur Gruppen anzeigen, in denen bereits Spiele gelaufen sind
  const activeGroups = groupStandings.filter((g) => g.rows.some((r) => r.played > 0));

  const favoriteCodes = favoriteTeams.map((t) => t.code);
  const favoritesOverview = buildFavoritesOverview(favoriteCodes, all);

  const jokerCapReached = all.filter((m) => m.myJoker).length >= MAX_JOKERS;
  const tipped = all.filter((m) => m.myPrediction !== null).length;

  const filter = searchParams.filter ?? "alle";
  const teamCode = searchParams.team ?? "";
  const selectedTeam = teamCode ? teams.find((t) => t.code === teamCode) ?? null : null;
  const matches = applyTeamFilter(applyFilter(all, filter, favoriteCodes), teamCode);

  const now = Date.now();
  const liveMatch = all.find((m) => m.status === "live") ?? null;
  const nextMatch = all.find((m) => m.status !== "finished" && m.kickoff.getTime() > now) ?? null;
  const openCount = all.filter(
    (m) => m.status !== "finished" && !isPickLocked(m.kickoff) && !m.myPrediction,
  ).length;

  const HOUR = 60 * 60 * 1000;
  const closingSoon = all.filter((m) => {
    if (m.status === "finished" || m.myPrediction) return false;
    const ms = msUntilLock(m.kickoff);
    return ms > 0 && ms <= HOUR;
  }).length;

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
        openCount={openCount}
        tipped={tipped}
        totalMatches={all.length}
      />

      {closingSoon > 0 && (
        <Link
          href="/spielplan?filter=offen"
          className="flex animate-glow-pulse items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-3 text-sm transition-colors hover:bg-amber-400/15"
        >
          <AlarmClock className="size-4 text-amber-300" />
          <span>
            <span className="font-semibold text-amber-300">{t.schedule.closingSoonTitle}</span>{" "}
            {t.schedule.closingSoon(closingSoon)}
          </span>
        </Link>
      )}

      {/* Torschützen + Meiste Tore nebeneinander */}
      {(topScorers.length > 0 || topTeams.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {topScorers.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Goal className="size-3.5 text-primary" />
                {t.history.topScorer}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {topScorers.map((p, i) => (
                  <div key={p.id} className="flex flex-col items-center gap-1.5 text-center">
                    <div className="relative">
                      {p.photo ? (
                        <Image
                          src={p.photo}
                          alt={p.name}
                          width={52}
                          height={52}
                          className="rounded-full object-cover ring-2 ring-primary/40"
                          unoptimized
                        />
                      ) : (
                        <div className="flex size-[52px] items-center justify-center rounded-full bg-secondary text-sm font-bold">
                          {p.name.charAt(0)}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                    </div>
                    <div className="min-w-0 w-full">
                      <div className="truncate text-xs font-semibold leading-tight">{p.name}</div>
                      <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                        {p.team && <Flag code={p.team.flagCode} className="text-xs" />}
                        <span className="font-bold tabular-nums text-primary">{p.goals}</span>
                        {t.history.goals}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topTeams.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Shield className="size-3.5 text-primary" />
                Meiste Tore
              </div>
              <div className="grid grid-cols-3 gap-2">
                {topTeams.map((team, i) => (
                  <div key={team.name} className="flex flex-col items-center gap-1.5 text-center">
                    <div className="relative flex size-[52px] items-center justify-center">
                      <Flag code={team.flagCode} className="text-4xl" />
                      <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                    </div>
                    <div className="min-w-0 w-full">
                      <div className="truncate text-xs font-semibold leading-tight">{team.name}</div>
                      <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                        <span className="font-bold tabular-nums text-primary">{team.goals}</span>
                        {t.history.goals}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live-Gruppenstand */}
      {activeGroups.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <h2 className="text-sm font-bold">{t.wm.groupsTitle}</h2>
            </div>
            <Link
              href="/wm/gruppen"
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.wm.group} A–L <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeGroups.map((g, i) => (
              <GroupTable key={g.group} group={g.group} rows={g.rows} index={i} />
            ))}
          </div>
        </section>
      )}

      {(liveMatch || nextMatch) && (
        <section className="space-y-3">
          {liveMatch && <FeaturedMatch match={liveMatch} />}
          {nextMatch && <FeaturedMatch match={nextMatch} />}
        </section>
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
            {t.schedule.favPrompt1} <span className="font-semibold">{t.schedule.favPromptWord}</span> {t.schedule.favPrompt2}
          </span>
        </Link>
      )}

      <ExploreTiles />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />
          <h2 className="text-lg font-bold">{t.schedule.title}</h2>
          <span className="text-sm text-muted-foreground">· {t.schedule.countInfo(all.length)}</span>
        </div>
        <FilterBar options={FILTERS} />
        <TeamFilter teams={teams as TeamFilterOption[]} />
      </div>

      {selectedTeam && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm">
          <Flag code={selectedTeam.flagCode} className="text-xl" />
          <span>
            {t.schedule.matchesOf} <span className="font-semibold">{selectedTeam.name}</span> · {t.schedule.matchCount(matches.length)}
          </span>
        </div>
      )}

      {days.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {selectedTeam
            ? t.schedule.emptyTeam(selectedTeam.name)
            : filter === "offen"
              ? t.schedule.emptyOpen
              : filter === "favoriten"
                ? favoriteCodes.length === 0
                  ? t.schedule.emptyFavNone
                  : t.schedule.emptyFav
                : t.schedule.emptyDefault}
        </p>
      ) : (
        days.map(([k, dayMatches]) => (
          <section key={k} className="space-y-3">
            <h2 className="sticky top-14 z-10 bg-background/80 py-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
              {dayLabel(dayMatches[0].kickoff, locale)}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {dayMatches.map((m, i) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  index={i}
                  favoriteCodes={favoriteCodes}
                  joker
                  jokerCapReached={jokerCapReached}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
