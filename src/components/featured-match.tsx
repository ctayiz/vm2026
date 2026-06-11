import { Badge } from "@/components/ui/badge";
import { Flag } from "@/components/flag";
import { Countdown } from "@/components/countdown";
import { PredictionPicker } from "@/components/prediction-picker";
import { dayLabel, formatTime } from "@/lib/format";
import { getLocale, getDictionary } from "@/lib/i18n-server";
import { getLockTime, isPickLocked } from "@/lib/lock";
import { outcomeOf } from "@/lib/scoring";
import { PHASE_META, type Phase, type Prediction } from "@/lib/constants";
import { localizePlaceholder } from "@/lib/team-map";
import { MapPin, Sparkles } from "lucide-react";
import type { MatchWithPrediction } from "@/lib/queries";
import { cn } from "@/lib/utils";

function side(team: { name: string; code: string; flagCode: string | null } | null, ph: string | null) {
  if (team) return { name: team.name, code: team.code, flagCode: team.flagCode, real: true };
  return { name: ph ?? "—", code: "?", flagCode: null, real: false };
}

export function FeaturedMatch({ match }: { match: MatchWithPrediction }) {
  const t = getDictionary();
  const locale = getLocale();
  const phase = match.phase as Phase;
  const home = side(match.homeTeam, localizePlaceholder(match.homePlaceholder, t.placeholder));
  const away = side(match.awayTeam, localizePlaceholder(match.awayPlaceholder, t.placeholder));
  const locked = isPickLocked(match.kickoff);
  const lockTimeIso = getLockTime(match.kickoff).toISOString();

  const live = match.status === "live";
  const hasScore = match.homeGoals != null && match.awayGoals != null;
  const PRED_LABEL: Record<Prediction, string> = {
    HOME_WIN: t.outcome.home,
    DRAW: t.outcome.draw,
    AWAY_WIN: t.outcome.away,
  };
  // Live: liegt der eigene Tipp aktuell vorn? (vorläufig)
  const liveOutcome =
    live && hasScore
      ? outcomeOf(match.homeGoals!, match.awayGoals!, (match.winner as "HOME" | "AWAY" | null) ?? null)
      : null;
  const liveLeading = match.myPrediction && liveOutcome ? match.myPrediction === liveOutcome : null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-[1px] shadow-xl",
        live
          ? "border-red-500/40 bg-gradient-to-br from-red-500/10 via-card to-card shadow-red-500/10"
          : "border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-primary/10",
      )}
    >
      {/* dezenter Glanz */}
      <div className="shimmer-gold pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative rounded-2xl px-5 py-5 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          {live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-red-400">
              <span className="size-1.5 animate-glow-pulse rounded-full bg-red-500" /> {t.match.live}
            </span>
          ) : (
            <Badge variant="default" className="gap-1">
              <Sparkles className="size-3" /> {t.match.next}
            </Badge>
          )}
          <span className="text-xs font-medium text-muted-foreground">
            {dayLabel(match.kickoff, locale)} · {formatTime(match.kickoff, locale)}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Heim */}
          <div className="flex flex-col items-center gap-2 text-center">
            <Flag code={home.flagCode} className="text-5xl drop-shadow sm:text-6xl" />
            <div>
              <div className={cn("font-bold leading-tight", !home.real && "text-sm italic text-muted-foreground")}>
                {home.name}
              </div>
              {home.real && <div className="text-xs text-muted-foreground">{home.code}</div>}
            </div>
          </div>

          {/* Mitte: Live-Stand oder vs + Countdown */}
          <div className="flex flex-col items-center gap-1">
            {live && hasScore ? (
              <span className="rounded-lg bg-red-500/20 px-3 py-1.5 text-2xl font-black tabular-nums text-red-300 sm:text-3xl">
                {match.homeGoals} : {match.awayGoals}
              </span>
            ) : (
              <>
                <span className="text-xl font-black text-muted-foreground">{t.match.vsShort}</span>
                <Countdown lockTimeIso={lockTimeIso} />
              </>
            )}
          </div>

          {/* Auswärts */}
          <div className="flex flex-col items-center gap-2 text-center">
            <Flag code={away.flagCode} className="text-5xl drop-shadow sm:text-6xl" />
            <div>
              <div className={cn("font-bold leading-tight", !away.real && "text-sm italic text-muted-foreground")}>
                {away.name}
              </div>
              {away.real && <div className="text-xs text-muted-foreground">{away.code}</div>}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            {t.phase[phase]?.label}
          </span>
          {match.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" /> {match.venue}
            </span>
          )}
        </div>

        {/* Live: eigenen Tipp + Live-Status zeigen. Sonst: Tipp-Picker. */}
        {live ? (
          <div className="mx-auto mt-4 flex max-w-sm items-center justify-center gap-2 text-sm">
            {match.myPrediction ? (
              <span className="text-muted-foreground">
                {t.match.yourTip}{" "}
                <span className="font-medium text-foreground">{PRED_LABEL[match.myPrediction]}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">{t.match.noTip}</span>
            )}
            {match.myPrediction && liveLeading !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  liveLeading ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground",
                )}
              >
                <span className="size-1.5 animate-glow-pulse rounded-full bg-current" />
                {liveLeading ? t.match.leading : t.match.trailing}
              </span>
            )}
          </div>
        ) : (
          <div className="mx-auto mt-4 max-w-sm">
            <PredictionPicker
              matchId={match.id}
              initialPrediction={match.myPrediction}
              locked={locked}
              allowDraw={!PHASE_META[phase]?.knockout}
              homeShort={home.real ? home.code : t.match.home}
              awayShort={away.real ? away.code : t.match.away}
            />
          </div>
        )}
      </div>
    </div>
  );
}
