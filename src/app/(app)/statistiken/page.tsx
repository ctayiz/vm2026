import { requireUser } from "@/lib/auth";
import { getUserStats, getMatches, getTopScorers, getTeamStats } from "@/lib/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopScorerList } from "@/components/top-scorer-list";
import { TeamTable } from "@/components/team-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Target,
  CheckCircle2,
  ListChecks,
  Trophy,
  Flame,
  Scale,
  Crosshair,
  Lock,
  Zap,
  Sparkles,
} from "lucide-react";
import { CountUp } from "@/components/count-up";
import { AccuracyRing } from "@/components/accuracy-ring";
import { cn } from "@/lib/utils";
import type { Prediction } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  index = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: string;
  index?: number;
}) {
  return (
    <Card className="card-hover animate-fade-up glass" style={{ animationDelay: `${index * 60}ms` }}>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-sky-500/20 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-xl font-bold tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
          {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function StatistikenPage() {
  const user = await requireUser();
  const t = getDictionary();
  const [stats, matches, topScorers, teamStats] = await Promise.all([
    getUserStats(user.id),
    getMatches(user.id),
    getTopScorers(),
    getTeamStats(),
  ]);

  const scored = matches.filter((m) => m.myScored);

  // Verteilung der eigenen (gewerteten) Tipps
  const dist: Record<Prediction, { total: number; correct: number }> = {
    HOME_WIN: { total: 0, correct: 0 },
    DRAW: { total: 0, correct: 0 },
    AWAY_WIN: { total: 0, correct: 0 },
  };
  for (const m of scored) {
    if (!m.myPrediction) continue;
    dist[m.myPrediction].total++;
    if ((m.myPoints ?? 0) > 0) dist[m.myPrediction].correct++;
  }

  // chronologisch (für Serie + Formkurve + Verlauf)
  const chrono = [...scored].sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());

  // Kumulierter Punkte-Verlauf nach Tag
  const ptsByDay = new Map<string, number>();
  for (const m of chrono) {
    const day = m.kickoff.toISOString().slice(0, 10);
    ptsByDay.set(day, (ptsByDay.get(day) ?? 0) + (m.myPoints ?? 0));
  }
  let cumPts = 0;
  const chartData = [...ptsByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, pts]) => { cumPts += pts; return { day, cum: cumPts }; });
  let best = 0;
  let run = 0;
  for (const m of chrono) {
    if ((m.myPoints ?? 0) > 0) {
      run++;
      best = Math.max(best, run);
    } else run = 0;
  }
  const form = chrono.slice(-8).map((m) => (m.myPoints ?? 0) > 0);

  // Joker-Treffer: ein gesetzter Joker, der Punkte gebracht hat
  const jokerHit = scored.some((m) => m.myJoker && (m.myPoints ?? 0) > 0);
  // Underdog: richtig getippt, obwohl die Gruppe mehrheitlich anders lag
  const underdogHits = scored.filter((m) => {
    if (!m.myPrediction || (m.myPoints ?? 0) <= 0) return false;
    const d = m.tipDistribution;
    if (!d || d.total < 3) return false;
    const counts: Record<Prediction, number> = {
      HOME_WIN: d.HOME_WIN,
      DRAW: d.DRAW,
      AWAY_WIN: d.AWAY_WIN,
    };
    const top = (Object.keys(counts) as Prediction[]).reduce((a, b) =>
      counts[b] > counts[a] ? b : a,
    );
    return top !== m.myPrediction;
  }).length;

  const achievements = [
    {
      id: "serie",
      label: t.stats.ach.serie,
      desc: t.stats.ach.serieDesc(best),
      icon: Flame,
      earned: best >= 3,
    },
    {
      id: "treffsicher",
      label: t.stats.ach.treffsicher,
      desc: t.stats.ach.treffsicherDesc,
      icon: Target,
      earned: stats.scoredCount >= 5 && stats.accuracy >= 0.6,
    },
    {
      id: "remis",
      label: t.stats.ach.remis,
      desc: t.stats.ach.remisDesc,
      icon: Scale,
      earned: dist.DRAW.correct >= 2,
    },
    {
      id: "scharf",
      label: t.stats.ach.scharf,
      desc: t.stats.ach.scharfDesc,
      icon: Crosshair,
      earned: stats.scoredCount >= 10 && stats.accuracy >= 0.8,
    },
    {
      id: "sammler",
      label: t.stats.ach.sammler,
      desc: t.stats.ach.sammlerDesc,
      icon: Trophy,
      earned: stats.totalPoints >= 15,
    },
    {
      id: "joker",
      label: t.stats.ach.joker,
      desc: t.stats.ach.jokerDesc,
      icon: Zap,
      earned: jokerHit,
    },
    {
      id: "underdog",
      label: t.stats.ach.underdog,
      desc: t.stats.ach.underdogDesc,
      icon: Sparkles,
      earned: underdogHits >= 1,
    },
  ];
  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t.stats.title}</h1>

      <Tabs defaultValue="bilanz">
        <TabsList>
          <TabsTrigger value="bilanz">{t.stats.tabBilanz}</TabsTrigger>
          <TabsTrigger value="torschuetzen">{t.stats.tabScorers}</TabsTrigger>
          <TabsTrigger value="teams">{t.stats.tabTeams}</TabsTrigger>
        </TabsList>

        <TabsContent value="bilanz" className="space-y-6">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
        <div className="blob right-[-15%] top-[-50%] h-48 w-48 animate-blob bg-sky-500/25" />
        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
          <AccuracyRing value={stats.accuracy} />
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold sm:text-3xl">
              <span className="text-gradient">{t.stats.balance}</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.stats.balanceSub(stats.rank ? `#${stats.rank}` : "—", stats.totalPlayers, stats.correctCount, stats.scoredCount)}
              {stats.bonusPoints > 0 && (
                <>
                  {" "}· <span className="font-semibold text-amber-300">{t.stats.bonus(stats.bonusPoints)}</span>
                </>
              )}
            </p>

            {/* Formkurve */}
            <div className="mt-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {t.stats.formTitle}
              </div>
              <div className="mt-1 flex items-center justify-center gap-1.5 sm:justify-start">
                {form.length === 0 ? (
                  <span className="text-sm text-muted-foreground">{t.stats.noScored}</span>
                ) : (
                  form.map((ok, i) => (
                    <span
                      key={i}
                      title={ok ? t.ranking.correct : "✗"}
                      className={cn(
                        "flex size-6 items-center justify-center rounded-md text-[10px] font-bold",
                        ok ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {ok ? "✓" : "—"}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KENNZAHLEN */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Trophy} label={t.stats.totalPoints} value={<CountUp value={stats.totalPoints} />} index={0} />
        <Stat
          icon={Target}
          label={t.stats.placement}
          value={stats.rank ? `#${stats.rank}` : "—"}
          sub={`${t.common.of} ${stats.totalPlayers}`}
          index={1}
        />
        <Stat
          icon={CheckCircle2}
          label={t.stats.correctTips}
          value={`${stats.correctCount}/${stats.scoredCount}`}
          index={2}
        />
        <Stat
          icon={ListChecks}
          label={t.stats.submitted}
          value={<CountUp value={stats.predictedCount} />}
          index={3}
        />
      </div>

      {/* PUNKTE-VERLAUF */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">{t.stats.pointsHistory}</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length < 2 ? (
            <p className="text-sm text-muted-foreground">{t.stats.pointsHistoryEmpty}</p>
          ) : (
            (() => {
              const W = 400, H = 80, px = 12, py = 10;
              const maxY = Math.max(...chartData.map((d) => d.cum), 1);
              const toX = (i: number) => px + (i / (chartData.length - 1)) * (W - 2 * px);
              const toY = (v: number) => H - py - (v / maxY) * (H - 2 * py);
              const linePts = chartData.map((d, i) => `${toX(i)},${toY(d.cum)}`).join(" ");
              const areaPts = [
                `${px},${H - py}`,
                ...chartData.map((d, i) => `${toX(i)},${toY(d.cum)}`),
                `${toX(chartData.length - 1)},${H - py}`,
              ].join(" ");
              const last = chartData[chartData.length - 1];
              const lx = toX(chartData.length - 1);
              const ly = toY(last.cum);
              return (
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
                  <defs>
                    <linearGradient id="ptGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <polygon points={areaPts} fill="url(#ptGrad)" />
                  <polyline points={linePts} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  {chartData.map((d, i) => (
                    <circle key={i} cx={toX(i)} cy={toY(d.cum)} r={i === chartData.length - 1 ? 4 : 2} fill="hsl(var(--primary))" opacity={i === chartData.length - 1 ? 1 : 0.55} />
                  ))}
                  <text x={lx} y={ly - 7} textAnchor={lx > W * 0.8 ? "end" : "middle"} fontSize="11" fill="hsl(var(--primary))" fontWeight="bold">{last.cum}</text>
                </svg>
              );
            })()
          )}
        </CardContent>
      </Card>

      {/* AUSZEICHNUNGEN */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>{t.stats.awards}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {earnedCount}/{achievements.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {achievements.map((a, i) => (
            <div
              key={a.id}
              className={cn(
                "animate-fade-up flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all",
                a.earned
                  ? "border-primary/40 bg-primary/10"
                  : "border-border bg-secondary/30 opacity-60",
              )}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div
                className={cn(
                  "relative flex size-12 items-center justify-center rounded-full",
                  a.earned
                    ? "bg-gradient-to-br from-amber-300 to-yellow-600 text-background animate-float"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                <a.icon className="size-6" />
                {!a.earned && (
                  <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-card">
                    <Lock className="size-3 text-muted-foreground" />
                  </span>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold">{a.label}</div>
                <div className="text-[10px] leading-tight text-muted-foreground">{a.desc}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* VERTEILUNG */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">{t.stats.distribution}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              ["HOME_WIN", t.outcome.home],
              ["DRAW", t.outcome.draw],
              ["AWAY_WIN", t.outcome.away],
            ] as [Prediction, string][]
          ).map(([key, label], i) => {
            const d = dist[key];
            const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
            return (
              <div key={key}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{label}</span>
                  <span className="text-muted-foreground">
                    {t.stats.distRight(d.correct, d.total, pct)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full origin-left animate-grow-x rounded-full bg-gradient-to-r from-primary to-sky-400"
                    style={{ width: `${pct}%`, animationDelay: `${i * 120}ms` }}
                  />
                </div>
              </div>
            );
          })}
          {stats.scoredCount === 0 && (
            <p className="text-sm text-muted-foreground">{t.stats.noScoredTips}</p>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="torschuetzen" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t.stats.scorersInfo}
          </p>
          <TopScorerList
            scorers={topScorers.map((p) => ({
              id: p.id,
              name: p.name,
              goals: p.goals,
              assists: p.assists,
              isTopScorer: p.isTopScorer,
              team: p.team ? { name: p.team.name, flagCode: p.team.flagCode } : null,
            }))}
          />
        </TabsContent>

        <TabsContent value="teams" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t.stats.teamsInfo}
          </p>
          <TeamTable rows={teamStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
