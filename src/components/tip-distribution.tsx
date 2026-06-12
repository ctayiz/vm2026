"use client";

import { useState } from "react";
import { Users, ChevronDown, ChevronUp } from "lucide-react";
import type { TipDistribution } from "@/lib/queries";
import type { Prediction } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Tipp-Verteilungs-Bar mit optionalem Toggle.
 *
 * autoShow=true  → wird immer angezeigt (nach Anpfiff / live / beendet)
 * autoShow=false → zeigt zunächst nur einen "Quoten anzeigen"-Button
 */
export function TipRevealSection({
  dist,
  myPick,
  homeShort,
  awayShort,
  autoShow,
  labelTipped,
  labelReveal,
  labelHide,
}: {
  dist: TipDistribution;
  myPick: Prediction | null;
  homeShort: string;
  awayShort: string;
  autoShow: boolean;
  labelTipped: string;
  labelReveal: string;
  labelHide: string;
}) {
  const [revealed, setRevealed] = useState(false);
  if (!dist || dist.total === 0) return null;

  const show = autoShow || revealed;
  const pct = (n: number) => Math.round((n / dist.total) * 100);
  const segs = [
    { key: "HOME_WIN" as const, label: homeShort, n: dist.HOME_WIN, color: "bg-primary" },
    { key: "DRAW" as const, label: "X", n: dist.DRAW, color: "bg-sky-500" },
    { key: "AWAY_WIN" as const, label: awayShort, n: dist.AWAY_WIN, color: "bg-violet-500" },
  ];

  if (!show) {
    return (
      <div className="mt-2">
        <button
          onClick={() => setRevealed(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
        >
          <Users className="size-3" />
          {labelReveal}
          <ChevronDown className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <Users className="size-3" /> {labelTipped}
        </p>
        {!autoShow && (
          <button
            onClick={() => setRevealed(false)}
            className="flex items-center gap-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {labelHide} <ChevronUp className="size-3" />
          </button>
        )}
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-secondary/60">
        {segs.map((s) =>
          s.n > 0 ? (
            <div
              key={s.key}
              className={cn(
                s.color,
                "transition-all",
                myPick === s.key && "ring-1 ring-inset ring-white/70",
              )}
              style={{ width: `${pct(s.n)}%` }}
            />
          ) : null,
        )}
      </div>
      <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground">
        {segs.map((s) => (
          <span key={s.key} className={cn(myPick === s.key && "font-bold text-foreground")}>
            {s.label} {pct(s.n)}%
          </span>
        ))}
      </div>
    </div>
  );
}
