"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toggleFavoriteAction } from "@/server/favorite-actions";
import { flagEmoji } from "@/lib/flags";
import { MAX_FAVORITES } from "@/lib/constants";
import { useT } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

export interface FavTeam {
  id: string;
  code: string;
  name: string;
  flagCode: string | null;
  group: string | null;
}

export function FavoritesPicker({
  teams,
  initialIds,
}: {
  teams: FavTeam[];
  initialIds: string[];
}) {
  const t = useT();
  const [selected, setSelected] = useState<string[]>(initialIds);
  const [, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const full = selected.length >= MAX_FAVORITES;

  const toggle = (teamId: string) => {
    setError(null);
    if (!selected.includes(teamId) && full) {
      setError(t.favorites.maxReached(MAX_FAVORITES));
      return;
    }
    // optimistisch
    setSelected((cur) => (cur.includes(teamId) ? cur.filter((id) => id !== teamId) : [...cur, teamId]));
    const fd = new FormData();
    fd.set("teamId", teamId);
    start(async () => {
      const res = await toggleFavoriteAction({ ok: false }, fd);
      if (res.ok && res.favorites) setSelected(res.favorites);
      else if (res.error) setError(res.error);
    });
  };

  const groups = new Map<string, FavTeam[]>();
  for (const team of teams) {
    const g = team.group ? t.favorites.group(team.group) : t.favorites.other;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(team);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {t.favorites.chosen(selected.length, MAX_FAVORITES)}
        </span>
        {error && <span className="text-xs text-red-300">{error}</span>}
      </div>

      <div className="space-y-3">
        {[...groups.entries()].map(([label, ts]) => (
          <div key={label}>
            <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="flex flex-wrap gap-2">
              {ts.map((team) => {
                const active = selected.includes(team.id);
                // NICHT bei laufendem Speichern (pending) sperren – sonst lässt sich
                // der nächste (z. B. 3.) Favorit währenddessen nicht anklicken.
                const disabled = !active && full;
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggle(team.id)}
                    disabled={disabled}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all",
                      active
                        ? "border-amber-400/60 bg-amber-400/15 text-foreground"
                        : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary",
                      disabled && !active && "opacity-40",
                    )}
                  >
                    <span className="text-base">{flagEmoji(team.flagCode)}</span>
                    {team.name}
                    {active && <Star className="size-3.5 fill-amber-300 text-amber-300" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
