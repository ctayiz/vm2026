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
} from "lucide-react";
import { CountUp } from "@/components/count-up";
import { AccuracyRing } from "@/components/accuracy-ring";
import { cn } from "@/lib/utils";
import type { Prediction } from "@/lib/constants";

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

  // chronologisch (für Serie + Formkurve)
  const chrono = [...scored].sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
  let best = 0;
  let run = 0;
  for (const m of chrono) {
    if ((m.myPoints ?? 0) > 0) {
      run++;
      best = Math.max(best, run);
    } else run = 0;
  }
  const form = chrono.slice(-8).map((m) => (m.myPoints ?? 0) > 0);

  const achievements = [
    {
      id: "serie",
      label: "Seriensieger",
      desc: best >= 3 ? `${best} richtige Tipps in Folge` : "3 richtige Tipps in Folge",
      icon: Flame,
      earned: best >= 3,
    },
    {
      id: "treffsicher",
      label: "Treffsicher",
      desc: "≥ 60 % Quote bei mind. 5 Tipps",
      icon: Target,
      earned: stats.scoredCount >= 5 && stats.accuracy >= 0.6,
    },
    {
      id: "remis",
      label: "Unentschieden-König",
      desc: "2 richtige Remis-Tipps",
      icon: Scale,
      earned: dist.DRAW.correct >= 2,
    },
    {
      id: "scharf",
      label: "Scharfschütze",
      desc: "≥ 80 % Quote bei mind. 10 Tipps",
      icon: Crosshair,
      earned: stats.scoredCount >= 10 && stats.accuracy >= 0.8,
    },
    {
      id: "sammler",
      label: "Punktesammler",
      desc: "15+ Gesamtpunkte",
      icon: Trophy,
      earned: stats.totalPoints >= 15,
    },
  ];
  const earnedCount = achievements.filter((a) => a.earned).length;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Statistiken</h1>

      <Tabs defaultValue="bilanz">
        <TabsList>
          <TabsTrigger value="bilanz">Meine Bilanz</TabsTrigger>
          <TabsTrigger value="torschuetzen">Torschützen</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="bilanz" className="space-y-6">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
        <div className="blob right-[-15%] top-[-50%] h-48 w-48 animate-blob bg-sky-500/25" />
        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
          <AccuracyRing value={stats.accuracy} />
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold sm:text-3xl">
              Deine <span className="text-gradient">Bilanz</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Rang{" "}
              <span className="font-semibold text-foreground">{stats.rank ? `#${stats.rank}` : "—"}</span> von{" "}
              {stats.totalPlayers} · {stats.correctCount}/{stats.scoredCount} richtig
              {stats.bonusPoints > 0 && (
                <>
                  {" "}
                  · <span className="font-semibold text-amber-300">+{stats.bonusPoints} Bonus</span>
                </>
              )}
            </p>

            {/* Formkurve */}
            <div className="mt-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Formkurve (zuletzt)
              </div>
              <div className="mt-1 flex items-center justify-center gap-1.5 sm:justify-start">
                {form.length === 0 ? (
                  <span className="text-sm text-muted-foreground">noch keine gewerteten Tipps</span>
                ) : (
                  form.map((ok, i) => (
                    <span
                      key={i}
                      title={ok ? "richtig" : "falsch"}
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
        <Stat icon={Trophy} label="Gesamtpunkte" value={<CountUp value={stats.totalPoints} />} index={0} />
        <Stat
          icon={Target}
          label="Platzierung"
          value={stats.rank ? `#${stats.rank}` : "—"}
          sub={`von ${stats.totalPlayers}`}
          index={1}
        />
        <Stat
          icon={CheckCircle2}
          label="Richtige Tipps"
          value={`${stats.correctCount}/${stats.scoredCount}`}
          index={2}
        />
        <Stat
          icon={ListChecks}
          label="Abgegeben"
          value={<CountUp value={stats.predictedCount} />}
          index={3}
        />
      </div>

      {/* AUSZEICHNUNGEN */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Auszeichnungen</span>
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
          <CardTitle className="text-base">Tipp-Verteilung (gewertet)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              ["HOME_WIN", "Heimsieg"],
              ["DRAW", "Unentschieden"],
              ["AWAY_WIN", "Auswärtssieg"],
            ] as const
          ).map(([key, label], i) => {
            const d = dist[key];
            const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
            return (
              <div key={key}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{label}</span>
                  <span className="text-muted-foreground">
                    {d.correct}/{d.total} richtig · {pct}%
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
            <p className="text-sm text-muted-foreground">Noch keine gewerteten Tipps.</p>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="torschuetzen" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Aktuelle Torschützenliste (Live-Daten via API-Football).
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
            Tabelle aus allen abgeschlossenen Spielen (Tore, Tordifferenz, Form).
          </p>
          <TeamTable rows={teamStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
