import { requireUser } from "@/lib/auth";
import { Flag } from "@/components/flag";
import { Card, CardContent } from "@/components/ui/card";
import { WORLD_CUPS, TITLE_HOLDERS } from "@/lib/wc-history";
import { getDictionary } from "@/lib/i18n-server";
import { Trophy, Crown, Goal, MapPin, History } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  await requireUser();
  const t = getDictionary();
  const firstYear = WORLD_CUPS[WORLD_CUPS.length - 1].year;
  const editions = WORLD_CUPS.length;
  const maxTitles = TITLE_HOLDERS[0].titles;

  return (
    <div className="space-y-5">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-amber-400/10 via-card to-card p-5 sm:p-6">
        <div className="blob right-[-15%] top-[-60%] h-44 w-44 animate-blob bg-amber-400/25" />
        <div className="relative space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
            <History className="size-4" /> {t.history.kicker}
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            <span className="text-gradient">{t.history.title}</span>
          </h1>
          <p className="max-w-lg text-sm text-muted-foreground">
            {t.history.subtitle(firstYear, editions)}
          </p>
        </div>
      </div>

      {/* Rekordweltmeister */}
      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Trophy className="size-4 text-amber-300" /> {t.history.records}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TITLE_HOLDERS.map((h, i) => (
            <Card
              key={h.team}
              className={cn(
                "card-hover animate-fade-up",
                h.titles === maxTitles && "border-amber-400/50",
              )}
              style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
            >
              <CardContent className="flex items-center gap-2.5 py-3">
                <Flag code={h.flag} className="text-2xl" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{h.team}</div>
                  <div className="flex items-center gap-1 text-xs text-amber-300">
                    {Array.from({ length: Math.min(h.titles, 5) }).map((_, k) => (
                      <Trophy key={k} className="size-3 fill-amber-300" />
                    ))}
                    <span className="ml-0.5 tabular-nums text-muted-foreground">
                      {h.titles} {t.history.titles}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Alle Turniere */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t.history.allTournaments}
        </h2>
        <div className="space-y-3">
          {WORLD_CUPS.map((w, i) => (
            <Card
              key={w.year}
              className="card-hover animate-fade-up overflow-hidden"
              style={{ animationDelay: `${Math.min(i, 14) * 35}ms` }}
            >
              {/* Kopf: Jahr + Gastgeber */}
              <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30 px-4 py-2">
                <span className="text-lg font-black tabular-nums text-foreground">{w.year}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  <Flag code={w.hostFlag} className="text-base" />
                  {w.host}
                </span>
              </div>

              <CardContent className="space-y-2 py-3">
                {/* Weltmeister */}
                <div className="flex items-center gap-2">
                  <Crown className="size-4 shrink-0 text-amber-300" />
                  <Flag code={w.championFlag} className="text-xl" />
                  <span className="font-bold">{w.champion}</span>
                  <span className="ml-auto rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                    {t.history.champion}
                  </span>
                </div>

                {/* Finale */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <span className="text-xs uppercase tracking-wide">{t.history.final}:</span>
                  <span className="flex items-center gap-1.5">
                    <Flag code={w.runnerUpFlag} className="text-base" />
                    {w.runnerUp}
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">{w.finalScore}</span>
                </div>

                {/* Torschützenkönig */}
                <div className="flex items-center gap-1.5 text-sm">
                  <Goal className="size-3.5 shrink-0 text-sky-300" />
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t.history.topScorer}:
                  </span>
                  <span className="truncate font-medium">{w.topScorer}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    · {w.topScorerGoals} {t.history.goals}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
