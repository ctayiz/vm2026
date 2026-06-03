"use client";

import { useState, useTransition } from "react";
import { Zap } from "lucide-react";
import { toggleJokerAction } from "@/server/prediction-actions";
import { burstConfetti } from "@/lib/confetti";
import { cn } from "@/lib/utils";

/**
 * Joker-Umschalter für ein Spiel. Sichtbar nur wenn getippt & nicht gesperrt.
 * `phaseLocked` = in dieser Phase ist der Joker bereits auf einem gesperrten
 * Spiel vergeben -> hier nicht möglich.
 */
export function JokerButton({
  matchId,
  active,
  phaseLocked,
}: {
  matchId: string;
  active: boolean;
  phaseLocked: boolean;
}) {
  const [pending, start] = useTransition();
  const [isActive, setIsActive] = useState(active);
  const [error, setError] = useState<string | null>(null);

  const disabled = pending || (phaseLocked && !isActive);

  const onClick = () => {
    setError(null);
    const fd = new FormData();
    fd.set("matchId", matchId);
    start(async () => {
      const res = await toggleJokerAction({ ok: false }, fd);
      if (res.ok) {
        setIsActive(!!res.active);
        if (res.active) burstConfetti();
      } else {
        setError(res.error ?? "Fehler");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={isActive}
        title={phaseLocked && !isActive ? "Joker in dieser Phase bereits vergeben" : "Joker = doppelte Punkte"}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40",
          isActive
            ? "border-amber-400/70 bg-amber-400/20 text-amber-300"
            : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary",
        )}
      >
        <Zap className={cn("size-3.5", isActive && "fill-amber-300")} />
        {isActive ? "Joker aktiv · 2×" : "Joker"}
      </button>
      {error && <span className="text-[10px] text-red-300">{error}</span>}
    </div>
  );
}
