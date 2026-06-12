import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getTeamProfile } from "@/lib/queries";
import { Flag } from "@/components/flag";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/lib/format";
import { type Phase } from "@/lib/constants";
import { localizePlaceholder } from "@/lib/team-map";
import { outcomeOf } from "@/lib/scoring";
import { getLocale, getDictionary } from "@/lib/i18n-server";
import { ArrowLeft, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchSquad, type SquadPlayer, hasApiFootball } from "@/lib/api-football";

export const dynamic = "force-dynamic";

type TeamRef = { code: string; name: string; flagCode: string | null } | null;

export default async function TeamPage({ params }: { params: { code: string } }) {
  await requireUser();
  const t = getDictionary();
  const locale = getLocale();
  const data = await getTeamProfile(decodeURIComponent(params.code).toUpperCase());
  if (!data) notFound();

  const { team, matches } = data;

  // Squad from API-Football (only if apiTeamId is known)
  let squad: SquadPlayer[] = [];
  if (team.apiTeamId && hasApiFootball()) {
    squad = await fetchSquad(team.apiTeamId).catch(() => []);
  }

  // Group by position in standard order
  const POS_ORDER = ["Goalkeeper", "Defender", "Midfielder", "Attacker"];
  const squadByPos = POS_ORDER.map((pos) => ({
    pos,
    players: squad.filter((p) => p.position === pos).sort((a, b) => (a.number ?? 99) - (b.number ?? 99)),
  })).filter((g) => g.players.length > 0);

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
                <span>{t.teamPage.reached(t.phase[team.reachedPhase as Phase]?.label ?? team.reachedPhase)}</span>
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
              const oppPlaceholder = localizePlaceholder(
                isHome ? m.awayPlaceholder : m.homePlaceholder,
                t.placeholder,
              );
              const finished =
                m.status === "finished" && m.homeGoals != null && m.awayGoals != null;
              const myGoals = isHome ? m.homeGoals : m.awayGoals;
              const oppGoals = isHome ? m.awayGoals : m.homeGoals;
              // K.-o.-Sieger berücksichtigen (Verlängerung/Elfmeter) – sonst Tore.
              const outcome =
                finished && myGoals != null && oppGoals != null
                  ? outcomeOf(m.homeGoals!, m.awayGoals!, (m.winner as "HOME" | "AWAY" | null) ?? null)
                  : null;
              const res = outcome
                ? outcome === "DRAW"
                  ? "draw"
                  : (outcome === "HOME_WIN") === isHome
                    ? "win"
                    : "loss"
                : null;

              return (
                <Card key={m.id} className="card-hover">
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="w-16 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {m.phase === "GROUP" && m.group
                        ? `${t.groupName} ${m.group}`
                        : t.phase[m.phase as Phase]?.short}
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

      {/* KADER */}
      {(team.apiTeamId || squad.length > 0) && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t.teamPage.squad}
          </h2>
          {squad.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t.teamPage.noSquad}
            </p>
          ) : (
            <div className="space-y-4">
              {squadByPos.map(({ pos, players }) => (
                <div key={pos}>
                  <div className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t.teamPage.pos[pos] ?? pos}
                  </div>
                  <div className="overflow-hidden rounded-xl border border-border">
                    {players.map((p, i) => (
                      <div
                        key={p.id}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm",
                          i !== players.length - 1 && "border-b border-border",
                        )}
                      >
                        <span className="w-6 shrink-0 text-right tabular-nums text-muted-foreground">
                          {p.number ?? "—"}
                        </span>
                        <span className="flex-1 font-medium">{p.name}</span>
                        {p.age != null && (
                          <span className="shrink-0 text-xs text-muted-foreground">{p.age} J.</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
