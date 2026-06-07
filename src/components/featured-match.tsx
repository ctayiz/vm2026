import { Badge } from "@/components/ui/badge";
import { Flag } from "@/components/flag";
import { Countdown } from "@/components/countdown";
import { PredictionPicker } from "@/components/prediction-picker";
import { dayLabel, formatTime } from "@/lib/format";
import { getLocale, getDictionary } from "@/lib/i18n-server";
import { getLockTime, isPickLocked } from "@/lib/lock";
import { PHASE_META, type Phase } from "@/lib/constants";
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
  const home = side(match.homeTeam, match.homePlaceholder);
  const away = side(match.awayTeam, match.awayPlaceholder);
  const locked = isPickLocked(match.kickoff);
  const lockTimeIso = getLockTime(match.kickoff).toISOString();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-[1px] shadow-xl shadow-primary/10">
      {/* dezenter Glanz */}
      <div className="shimmer-gold pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative rounded-2xl px-5 py-5 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <Badge variant="default" className="gap-1">
            <Sparkles className="size-3" /> {t.match.next}
          </Badge>
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

          {/* Mitte */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl font-black text-muted-foreground">{t.match.vsShort}</span>
            <Countdown lockTimeIso={lockTimeIso} />
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

        <div className="mx-auto mt-4 max-w-sm">
          <PredictionPicker
            matchId={match.id}
            initialPrediction={match.myPrediction}
            locked={locked}
            homeShort={home.real ? home.code : t.match.home}
            awayShort={away.real ? away.code : t.match.away}
          />
        </div>
      </div>
    </div>
  );
}
