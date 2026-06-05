import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Rang-Bewegung seit dem letzten Spieltag.
 * delta > 0 = aufgestiegen (grün ▲), < 0 = abgestiegen (rot ▼), 0/undefined = nichts.
 */
export function RankDelta({ delta, className }: { delta?: number; className?: string }) {
  if (!delta) return null;
  const up = delta > 0;
  const n = Math.abs(delta);
  return (
    <span
      title={up ? `+${n} seit letztem Spieltag` : `−${n} seit letztem Spieltag`}
      className={cn(
        "inline-flex items-center gap-px text-[10px] font-bold leading-none tabular-nums",
        up ? "text-emerald-400" : "text-red-400",
        className,
      )}
    >
      {up ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      {n}
    </span>
  );
}
