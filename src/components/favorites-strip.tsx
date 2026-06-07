import Link from "next/link";
import { Star } from "lucide-react";
import { Flag } from "@/components/flag";
import { PredictionPicker } from "@/components/prediction-picker";
import { formatTime, dayLabel } from "@/lib/format";
import { getLocale, getDictionary } from "@/lib/i18n-server";
import { isPickLocked } from "@/lib/lock";
import { cn } from "@/lib/utils";
import type { MatchWithPrediction } from "@/lib/queries";
import type { Prediction } from "@/lib/constants";

interface TeamRef {
  name: string;
  code: string;
  flagCode: string | null;
}

export interface FavoriteOverview {
  code: string;
  team: TeamRef | null;
  last: MatchWithPrediction | null;
  next: MatchWithPrediction | null;
}

function ResultLine({ code, match }: { code: string; match: MatchWithPrediction }) {
  const isHome = match.homeTeam?.code === code;
  const own = isHome ? match.homeGoals : match.awayGoals;
  const opp = isHome ? match.awayGoals : match.homeGoals;
  const oppTeam = isHome ? match.awayTeam : match.homeTeam;
  const res = own == null || opp == null ? null : own > opp ? "W" : own < opp ? "L" : "D";
  const color = res === "W" ? "text-primary" : res === "L" ? "text-red-300" : "text-muted-foreground";
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className={cn("font-bold tabular-nums", color)}>
        {own}:{opp}
      </span>
      <span className="text-muted-foreground">vs</span>
      <Flag code={oppTeam?.flagCode} className="text-sm" />
      <span className="truncate text-muted-foreground">{oppTeam?.code ?? "?"}</span>
    </span>
  );
}

export function FavoritesStrip({ items }: { items: FavoriteOverview[] }) {
  const t = getDictionary();
  const locale = getLocale();
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Star className="size-4 fill-amber-300 text-amber-300" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t.favorites.title}
        </h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {items.map((f, i) => {
          const next = f.next;
          const nextLocked = next ? isPickLocked(next.kickoff) : false;
          const oppOfNext = next
            ? next.homeTeam?.code === f.code
              ? next.awayTeam
              : next.homeTeam
            : null;
          return (
            <div
              key={f.code}
              className="card-hover animate-fade-up glass flex flex-col gap-1.5 overflow-hidden rounded-xl px-3 py-2.5"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Link
                href={`/spielplan?team=${f.code}`}
                className="flex items-center gap-2 hover:opacity-90"
              >
                <Flag code={f.team?.flagCode} className="text-xl" />
                <span className="truncate text-sm font-semibold">{f.team?.name}</span>
                <Star className="ml-auto size-3.5 fill-amber-300 text-amber-300" />
              </Link>

              {f.last ? (
                <ResultLine code={f.code} match={f.last} />
              ) : (
                <span className="text-xs text-muted-foreground">{t.favorites.noResult}</span>
              )}

              {next ? (
                <div className="mt-0.5 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{t.favorites.next}</span>
                    <Flag code={oppOfNext?.flagCode} className="text-sm" />
                    <span className="min-w-0 truncate">{oppOfNext?.code ?? t.bracket.open}</span>
                    <span className="ml-auto">
                      {dayLabel(next.kickoff, locale)} {formatTime(next.kickoff, locale)}
                    </span>
                  </div>
                  <PredictionPicker
                    matchId={next.id}
                    initialPrediction={(next.myPrediction as Prediction | null) ?? null}
                    locked={nextLocked}
                    homeShort={next.homeTeam?.code ?? t.match.home}
                    awayShort={next.awayTeam?.code ?? t.match.away}
                    compact
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">{t.favorites.noNext}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
