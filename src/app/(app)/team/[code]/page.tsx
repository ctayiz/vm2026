import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getTeamProfile } from "@/lib/queries";
import { Flag } from "@/components/flag";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/lib/format";
import { PHASE_META, type Phase } from "@/lib/constants";
import { getLocale, getDictionary } from "@/lib/i18n-server";
import { ArrowLeft, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type TeamRef = { code: string; name: string; flagCode: string | null } | null;

export default async function TeamPage({ params }: { params: { code: string } }) {
  await requireUser();
  const t = getDictionary();
  const locale = getLocale();
  const data = await getTeamProfile(decodeURIComponent(params.code).toUpperCase());
  if (!data) notFound();

  const { team, matches } = data;

  return (
    <div className="space-y-5">
      <Link
        href="/wm/gruppen"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t.teamPage.back}
      </Link>

      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
        <div className="blob right-[-15%] top-[-60%] h-40 w-40 animate-blob bg-primary/25" />
        <div className="relative flex items-center gap-4">
          <Flag code={team.flagCode} className="text-5xl sm:text-6xl" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold sm:text-3xl">{team.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {team.group && (
                <Badge variant="secondary">
                  {t.teamPage.group} {team.group}
                </Badge>
              )}
              {team.isChampion ? (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                  <Trophy className="size-4" /> {t.teamPage.champion}
                </span>
              ) : team.reachedPhase ? (
                <span>{t.teamPage.reached(PHASE_META[team.reachedPhase as Phase]?.label ?? team.reachedPhase)}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* SPIELE */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t.teamPage.fixtures}
        </h2>
        {matches.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {t.teamPage.noMatches}
          </p>
        ) : (
          <div className="space-y-2">
            {matches.map((m) => {
              const isHome = m.homeTeam?.code === team.code;
              const opp: TeamRef = isHome ? m.awayTeam : m.homeTeam;
              const oppPlaceholder = isHome ? m.awayPlaceholder : m.homePlaceholder;
              const finished =
                m.status === "finished" && m.homeGoals != null && m.awayGoals != null;
              const myGoals = isHome ? m.homeGoals : m.awayGoals;
              const oppGoals = isHome ? m.awayGoals : m.homeGoals;
              const res =
                finished && myGoals != null && oppGoals != null
                  ? myGoals > oppGoals
                    ? "win"
                    : myGoals < oppGoals
                      ? "loss"
                      : "draw"
                  : null;

              return (
                <Card key={m.id} className="card-hover">
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="w-16 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {m.roundLabel ?? PHASE_META[m.phase as Phase]?.short}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Flag code={opp?.flagCode} className="text-xl" />
                      <span
                        className={cn(
                          "truncate text-sm font-medium",
                          !opp && "italic text-muted-foreground",
                        )}
                      >
                        {opp?.name ?? oppPlaceholder ?? "—"}
                      </span>
                    </div>
                    {finished ? (
                      <Badge
                        variant={res === "win" ? "success" : res === "loss" ? "destructive" : "secondary"}
                        className="shrink-0 tabular-nums"
                      >
                        {myGoals}:{oppGoals}
                      </Badge>
                    ) : (
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        <div>{formatDate(m.kickoff, locale)}</div>
                        <div>{formatTime(m.kickoff, locale)}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
