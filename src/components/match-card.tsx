import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flag } from "@/components/flag";
import { Countdown } from "@/components/countdown";
import { PredictionPicker } from "@/components/prediction-picker";
import { JokerButton } from "@/components/joker-button";
import { formatTime } from "@/lib/format";
import { getLockTime, isPickLocked } from "@/lib/lock";
import { outcomeFromGoals } from "@/lib/scoring";
import { PHASE_META, type Phase, type Prediction } from "@/lib/constants";
import { MapPin, Trophy, Goal, Star, Zap } from "lucide-react";
import type { MatchWithPrediction } from "@/lib/queries";
import { cn } from "@/lib/utils";

function teamDisplay(
  team: { name: string; code: string; flagCode: string | null } | null,
  placeholder: string | null,
) {
  if (team) return { name: team.name, code: team.code, flagCode: team.flagCode, isReal: true };
  return { name: placeholder ?? "offen", code: "?", flagCode: null, isReal: false };
}

const PRED_LABEL: Record<Prediction, string> = {
  HOME_WIN: "Heimsieg",
  DRAW: "Unentschieden",
  AWAY_WIN: "Auswärtssieg",
};

export function MatchCard({
  match,
  index = 0,
  favoriteCodes = [],
  joker = false,
  phaseJokerLocked = false,
}: {
  match: MatchWithPrediction;
  index?: number;
  favoriteCodes?: string[];
  joker?: boolean; // Joker-Feature für diese Karte aktiv
  phaseJokerLocked?: boolean; // Joker dieser Phase bereits auf gesperrtem Spiel
}) {
  const phase = match.phase as Phase;
  const home = teamDisplay(match.homeTeam, match.homePlaceholder);
  const away = teamDisplay(match.awayTeam, match.awayPlaceholder);
  const homeFav = home.isReal && favoriteCodes.includes(home.code);
  const awayFav = away.isReal && favoriteCodes.includes(away.code);
  const isFavMatch = homeFav || awayFav;
  const locked = isPickLocked(match.kickoff);
  const lockTimeIso = getLockTime(match.kickoff).toISOString();
  const finished = match.status === "finished" && match.homeGoals != null && match.awayGoals != null;

  const actualOutcome = finished ? outcomeFromGoals(match.homeGoals!, match.awayGoals!) : null;
  const correct = match.myPrediction && actualOutcome ? match.myPrediction === actualOutcome : null;

  return (
    <Card
      className={cn(
        "card-hover animate-fade-up overflow-hidden",
        isFavMatch && "border-amber-400/40 ring-1 ring-amber-400/20",
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium">
          {PHASE_META[phase]?.knockout && <Trophy className="size-3 text-amber-300" />}
          {match.roundLabel ?? PHASE_META[phase]?.label}
        </span>
        <span>{formatTime(match.kickoff)}</span>
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

          {/* Mitte: Ergebnis oder vs */}
          <div className="shrink-0 px-2 text-center">
            {finished ? (
              <span className="rounded-md bg-secondary px-2 py-1 text-base font-bold tabular-nums">
                {match.homeGoals} : {match.awayGoals}
              </span>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">vs</span>
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

      {finished && match.goals.length > 0 && (
        <div className="border-t border-border/60 px-4 py-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {match.goals.map((g) => (
              <span key={g.id} className="inline-flex items-center gap-1">
                <Goal className="size-3 text-primary" />
                {g.playerName}
                {g.minute != null && <span className="text-[10px]">{g.minute}{"'"}</span>}
                {g.type === "penalty" && <span className="text-[10px]">(E)</span>}
                {g.type === "own" && <span className="text-[10px]">(ET)</span>}
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
                  Dein Tipp: <span className="font-medium text-foreground">{PRED_LABEL[match.myPrediction]}</span>
                </>
              ) : (
                "Kein Tipp abgegeben"
              )}
              {match.myJoker && (
                <span className="inline-flex items-center gap-0.5 text-amber-300" title="Joker · doppelte Punkte">
                  <Zap className="size-3 fill-amber-300" />
                </span>
              )}
            </span>
            {match.myPrediction && (
              <Badge variant={correct ? "success" : "destructive"}>
                {correct ? `+${match.myPoints ?? 0} Punkte` : "0 Punkte"}
              </Badge>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <PredictionPicker
              matchId={match.id}
              initialPrediction={match.myPrediction}
              locked={locked}
              homeShort={home.isReal ? home.code : "Heim"}
              awayShort={away.isReal ? away.code : "Gast"}
            />
            {joker && !locked && match.myPrediction && (
              <JokerButton matchId={match.id} active={match.myJoker} phaseLocked={phaseJokerLocked} />
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
