import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flag } from "@/components/flag";
import { Countdown } from "@/components/countdown";
import { PredictionPicker } from "@/components/prediction-picker";
import { JokerButton } from "@/components/joker-button";
import { TipRevealSection } from "@/components/tip-distribution";
import { formatTime } from "@/lib/format";
import { getLockTime, isPickLocked } from "@/lib/lock";
import { outcomeOf } from "@/lib/scoring";
import { localizePlaceholder } from "@/lib/team-map";
import { PHASE_META, type Phase, type Prediction } from "@/lib/constants";
import { getLocale, getDictionary } from "@/lib/i18n-server";
import { MapPin, Trophy, Goal, Star, Zap } from "lucide-react";
import type { MatchWithPrediction } from "@/lib/queries";
import { cn } from "@/lib/utils";

function teamDisplay(
  team: { name: string; code: string; flagCode: string | null } | null,
  placeholder: string | null,
) {
  if (team) return { name: team.name, code: team.code, flagCode: team.flagCode, isReal: true };
  return { name: placeholder ?? "—", code: "?", flagCode: null, isReal: false };
}

export function MatchCard({
  match,
  index = 0,
  favoriteCodes = [],
  joker = false,
  jokerCapReached = false,
}: {
  match: MatchWithPrediction;
  index?: number;
  favoriteCodes?: string[];
  joker?: boolean; // Joker-Feature für diese Karte aktiv
  jokerCapReached?: boolean; // alle 3 Joker bereits vergeben
}) {
  const t = getDictionary();
  const locale = getLocale();
  const PRED_LABEL: Record<Prediction, string> = {
    HOME_WIN: t.outcome.home,
    DRAW: t.outcome.draw,
    AWAY_WIN: t.outcome.away,
  };
  const phase = match.phase as Phase;
  const isKnockout = !!PHASE_META[phase]?.knockout;
  const matchWinner = (match.winner as "HOME" | "AWAY" | null) ?? null;
  // Rundenlabel lokalisiert aufbauen (statt des deutsch gespeicherten roundLabel)
  const roundLabel =
    phase === "GROUP" && match.group ? `${t.groupName} ${match.group}` : t.phase[phase]?.label;
  const home = teamDisplay(match.homeTeam, localizePlaceholder(match.homePlaceholder, t.placeholder));
  const away = teamDisplay(match.awayTeam, localizePlaceholder(match.awayPlaceholder, t.placeholder));
  const homeFav = home.isReal && favoriteCodes.includes(home.code);
  const awayFav = away.isReal && favoriteCodes.includes(away.code);
  const isFavMatch = homeFav || awayFav;
  const locked = isPickLocked(match.kickoff);
  const lockTimeIso = getLockTime(match.kickoff).toISOString();
  const finished = match.status === "finished" && match.homeGoals != null && match.awayGoals != null;
  const live = match.status === "live";
  const hasScore = match.homeGoals != null && match.awayGoals != null;

  const wentToET = match.apiStatus === "AET" || match.apiStatus === "PEN";
  const actualOutcome = finished ? outcomeOf(match.homeGoals!, match.awayGoals!, matchWinner) : null;
  // Korrektheit: bei AET/PEN + DRAW-Tipp muss auch V/E-Sieger stimmen
  let correct: boolean | null = null;
  if (match.myPrediction && finished) {
    if (wentToET && match.myPrediction === "DRAW") {
      correct = !!match.myKnockoutWinner && match.myKnockoutWinner === matchWinner;
    } else {
      correct = actualOutcome ? match.myPrediction === actualOutcome : null;
    }
  }

  // Live: liegt der eigene Tipp aktuell vorn? (vorläufig, noch keine Punkte)
  const liveOutcome = live && hasScore ? outcomeOf(match.homeGoals!, match.awayGoals!, matchWinner) : null;
  const liveLeading = match.myPrediction && liveOutcome ? match.myPrediction === liveOutcome : null;

  return (
    <Card
      className={cn(
        "card-hover animate-fade-up overflow-hidden",
        isFavMatch && "border-amber-400/40 ring-1 ring-amber-400/20",
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <Link href={`/spiel/${match.id}`} className="block transition-colors hover:bg-secondary/10">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium">
          {PHASE_META[phase]?.knockout && <Trophy className="size-3 text-amber-300" />}
          {roundLabel}
        </span>
        {live ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-400">
            <span className="size-1.5 animate-glow-pulse rounded-full bg-red-500" /> {t.match.live}
          </span>
        ) : (
          <span>{formatTime(match.kickoff, locale)}</span>
        )}
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Heim */}
          <div className="flex flex-1 items-center gap-2 truncate">
            <Flag code={home.flagCode} className="text-2xl" />
            <span className={cn("truncate text-sm font-semibold", !home.isReal && "italic text-muted-foreground")}>
              {home.name}
            </span>
            {homeFav && <Star className="size-3 shrink-0 fill-amber-300 text-amber-300" />}
          </div>

          {/* Mitte: Ergebnis (auch live) oder vs */}
          <div className="shrink-0 px-2 text-center">
            {finished || (live && hasScore) ? (
              <span
                className={cn(
                  "rounded-md px-2 py-1 text-base font-bold tabular-nums",
                  live ? "bg-red-500/20 text-red-300" : "bg-secondary",
                )}
              >
                {match.homeGoals} : {match.awayGoals}
              </span>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">{t.common.vs}</span>
            )}
          </div>

          {/* Auswärts */}
          <div className="flex flex-1 items-center justify-end gap-2 truncate">
            {awayFav && <Star className="size-3 shrink-0 fill-amber-300 text-amber-300" />}
            <span className={cn("truncate text-right text-sm font-semibold", !away.isReal && "italic text-muted-foreground")}>
              {away.name}
            </span>
            <Flag code={away.flagCode} className="text-2xl" />
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1 truncate">
            <MapPin className="size-3" /> {match.venue ?? "—"}
            {match.city ? `, ${match.city}` : ""}
          </span>
          {!finished && <Countdown lockTimeIso={lockTimeIso} />}
        </div>
      </div>
      </Link>

      {finished && match.goals.length > 0 && (
        <div className="border-t border-border/60 px-4 py-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {match.goals.map((g) => (
              <span key={g.id} className="inline-flex items-center gap-1">
                <Goal className="size-3 text-primary" />
                {g.playerName}
                {g.minute != null && <span className="text-[10px]">{g.minute}{"'"}</span>}
                {g.type === "penalty" && <span className="text-[10px]">{t.match.pen}</span>}
                {g.type === "own" && <span className="text-[10px]">{t.match.og}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border/60 bg-background/30 px-4 py-3">
        {finished ? (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {match.myPrediction ? (
                <>
                  {t.match.yourTip}{" "}
                  <span className="font-medium text-foreground">
                    {PRED_LABEL[match.myPrediction]}
                    {match.myPrediction === "DRAW" && isKnockout && match.myKnockoutWinner && (
                      <span className="ml-1 text-muted-foreground">
                        (+{match.myKnockoutWinner === "HOME" ? home.code : away.code})
                      </span>
                    )}
                  </span>
                </>
              ) : (
                t.match.noTip
              )}
              {match.myJoker && (
                <span className="inline-flex items-center gap-0.5 text-amber-300" title={t.joker.title}>
                  <Zap className="size-3 fill-amber-300" />
                </span>
              )}
            </span>
            {match.myPrediction && (
              <Badge variant={(match.myScored ? (match.myPoints ?? 0) > 0 : correct) ? "success" : "destructive"}>
                {(match.myScored ? (match.myPoints ?? 0) > 0 : correct)
                  ? t.match.plusPoints(match.myPoints ?? 0)
                  : t.match.zeroPoints}
              </Badge>
            )}
          </div>
        ) : live ? (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {match.myPrediction ? (
                <>
                  {t.match.yourTip}{" "}
                  <span className="font-medium text-foreground">
                    {PRED_LABEL[match.myPrediction]}
                    {match.myPrediction === "DRAW" && isKnockout && match.myKnockoutWinner && (
                      <span className="ml-1 text-muted-foreground">
                        (+{match.myKnockoutWinner === "HOME" ? home.code : away.code})
                      </span>
                    )}
                  </span>
                </>
              ) : (
                t.match.noTip
              )}
              {match.myJoker && (
                <span className="inline-flex items-center gap-0.5 text-amber-300" title={t.joker.title}>
                  <Zap className="size-3 fill-amber-300" />
                </span>
              )}
            </span>
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
          <div className="space-y-2">
            <PredictionPicker
              matchId={match.id}
              initialPrediction={match.myPrediction}
              initialKnockoutWinner={match.myKnockoutWinner}
              locked={locked}
              isKnockout={isKnockout}
              homeShort={home.isReal ? home.code : t.match.home}
              awayShort={away.isReal ? away.code : t.match.away}
            />
            {joker && !locked && match.myPrediction && (
              <JokerButton matchId={match.id} active={match.myJoker} capReached={jokerCapReached} />
            )}
          </div>
        )}

        {match.tipDistribution && (
          <TipRevealSection
            dist={match.tipDistribution}
            myPick={match.myPrediction}
            homeShort={home.isReal ? home.code : t.match.home}
            awayShort={away.isReal ? away.code : t.match.away}
            autoShow={locked}
            labelTipped={t.match.groupTipped(match.tipDistribution.total)}
            labelReveal={t.match.revealTips}
            labelHide={t.match.hideTips}
          />
        )}
      </div>
    </Card>
  );
}
