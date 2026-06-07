"use client";

import { useState, useTransition } from "react";
import { Check, CircleHelp, Trophy, Goal } from "lucide-react";
import { submitTournamentBetAction } from "@/server/tournament-actions";
import { burstConfetti } from "@/lib/confetti";
import { flagEmoji } from "@/lib/flags";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n-provider";

export interface TeamOption {
  id: string;
  code: string;
  name: string;
  flagCode: string | null;
  group: string | null;
}

export interface PlayerOption {
  id: string;
  name: string;
  teamName: string | null;
  goals: number;
}

export interface QuestionView {
  key: string;
  label: string;
  hint: string;
  points: number;
  pick: "TEAM" | "PLAYER";
  pickedTeamId: string | null;
  pickedPlayerId: string | null;
  pickedLabel: string | null;
  pickedFlag: string | null;
  status: "fulfilled" | "missed" | "open";
  earnedPoints: number | null;
  locked: boolean;
}

export function TournamentBetCard({
  question,
  teams,
  players,
  index,
}: {
  question: QuestionView;
  teams: TeamOption[];
  players: PlayerOption[];
  index: number;
}) {
  const t = useT();
  const isPlayer = question.pick === "PLAYER";
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState(
    (isPlayer ? question.pickedPlayerId : question.pickedTeamId) ?? "",
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optionen nach Gruppe (Teams) bzw. Team (Spieler) bündeln
  const optgroups = new Map<string, { value: string; label: string }[]>();
  if (isPlayer) {
    for (const pl of players) {
      const g = pl.teamName || t.favorites.other;
      if (!optgroups.has(g)) optgroups.set(g, []);
      optgroups.get(g)!.push({ value: pl.id, label: `${pl.name} · ${pl.goals} ${t.scorers.goals}` });
    }
  } else {
    for (const tm of teams) {
      const g = tm.group ? t.favorites.group(tm.group) : t.favorites.other;
      if (!optgroups.has(g)) optgroups.set(g, []);
      optgroups.get(g)!.push({ value: tm.id, label: tm.name });
    }
  }

  const onChange = (id: string) => {
    setPicked(id);
    setError(null);
    const fd = new FormData();
    fd.set("questionKey", question.key);
    fd.set(isPlayer ? "playerId" : "teamId", id);
    start(async () => {
      const res = await submitTournamentBetAction({ ok: false }, fd);
      if (res.ok) {
        setSaved(true);
        burstConfetti();
        setTimeout(() => setSaved(false), 1500);
      } else {
        setError(res.error ?? "Fehler");
      }
    });
  };

  const statusBadge = () => {
    if (question.status === "fulfilled")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
          <Check className="size-3" /> {t.tournament.fulfilled(question.earnedPoints ?? 0)}
        </span>
      );
    if (question.status === "missed")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
          {t.tournament.missed}
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-0.5 text-xs text-muted-foreground">
        <CircleHelp className="size-3" /> {t.tournament.open}
      </span>
    );
  };

  const noPlayers = isPlayer && players.length === 0;

  return (
    <div
      className={cn(
        "card-hover animate-fade-up glass rounded-xl p-4",
        question.status === "fulfilled" && "border-primary/40",
      )}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            {isPlayer ? <Goal className="size-4 text-sky-300" /> : <Trophy className="size-4 text-amber-300" />}
            {question.label}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{question.hint}</p>
        </div>
        <span className="shrink-0 rounded-lg bg-gradient-to-br from-amber-300 to-yellow-600 px-2 py-1 text-sm font-bold text-background">
          {question.points} {t.common.pts}
        </span>
      </div>

      {question.locked ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2">
          <span className="flex items-center gap-2 text-sm">
            {question.pickedLabel ? (
              <>
                {question.pickedFlag && <span className="text-xl">{flagEmoji(question.pickedFlag)}</span>}
                {question.pickedLabel}
              </>
            ) : (
              <span className="text-muted-foreground">{t.tournament.noTip}</span>
            )}
          </span>
          {statusBadge()}
        </div>
      ) : noPlayers ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          {t.tournament.noPlayers}
        </p>
      ) : (
        <div className="space-y-2">
          <select
            value={picked}
            disabled={pending}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-background/60 px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:text-sm"
          >
            <option value="" disabled>
              {isPlayer ? t.tournament.pickPlayer : t.tournament.pickTeam}
            </option>
            {[...optgroups.entries()].map(([label, opts]) => (
              <optgroup key={label} label={label}>
                {opts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="flex h-4 items-center gap-2 text-xs">
            {saved ? (
              <span className="flex animate-pop-in items-center gap-1 text-primary">
                <Check className="size-3" /> {t.common.saved}
              </span>
            ) : error ? (
              <span className="text-red-300">{error}</span>
            ) : (
              <span className="text-muted-foreground">{t.tournament.changeable}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
