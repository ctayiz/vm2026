"use client";

import { useState, useTransition } from "react";
import { Zap } from "lucide-react";
import { toggleJokerAction } from "@/server/prediction-actions";
import { burstConfetti } from "@/lib/confetti";
import { jokerHaptic, tapHaptic } from "@/lib/haptics";
import { useT } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

/**
 * Joker-Umschalter für ein Spiel. Sichtbar nur wenn getippt & nicht gesperrt.
 * `capReached` = der Nutzer hat bereits alle 3 Joker vergeben -> hier nur noch
 * möglich, wenn dieses Spiel selbst der Joker ist (zum Entfernen).
 */
export function JokerButton({
  matchId,
  active,
  capReached,
}: {
  matchId: string;
  active: boolean;
  capReached: boolean;
}) {
  const t = useT();
  const [pending, start] = useTransition();
  const [isActive, setIsActive] = useState(active);
  const [error, setError] = useState<string | null>(null);

  const disabled = pending || (capReached && !isActive);

  const onClick = () => {
    setError(null);
    tapHaptic();
    const fd = new FormData();
    fd.set("matchId", matchId);
    start(async () => {
      const res = await toggleJokerAction({ ok: false }, fd);
      if (res.ok) {
        setIsActive(!!res.active);
        if (res.active) {
          burstConfetti();
          jokerHaptic();
        }
      } else {
        setError(res.error ?? t.common.error);
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
        title={capReached && !isActive ? t.joker.lockedHint : t.joker.title}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
          isActive
            ? "border-amber-400/70 bg-amber-400/20 text-amber-300"
            : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary",
        )}
      >
        <Zap className={cn("size-3.5", isActive && "fill-amber-300")} />
        {isActive ? t.joker.active : t.joker.set}
      </button>
      {error && <span className="text-[10px] text-red-300">{error}</span>}
    </div>
  );
}
