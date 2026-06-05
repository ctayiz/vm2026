import { Users } from "lucide-react";
import { getDictionary } from "@/lib/i18n-server";
import type { TipDistribution as Dist } from "@/lib/queries";
import type { Prediction } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Aggregierte Tipp-Verteilung der ganzen Gruppe für ein Spiel (ohne Namen).
 * Wird nur nach Tipp-Schluss angezeigt. Der eigene Tipp ist hervorgehoben.
 */
export function GroupTipBar({
  dist,
  myPick,
  homeShort,
  awayShort,
}: {
  dist: Dist;
  myPick: Prediction | null;
  homeShort: string;
  awayShort: string;
}) {
  const t = getDictionary();
  if (!dist || dist.total === 0) return null;
  const pct = (n: number) => Math.round((n / dist.total) * 100);

  const segs = [
    { key: "HOME_WIN" as const, label: homeShort, n: dist.HOME_WIN, color: "bg-primary" },
    { key: "DRAW" as const, label: "X", n: dist.DRAW, color: "bg-sky-500" },
    { key: "AWAY_WIN" as const, label: awayShort, n: dist.AWAY_WIN, color: "bg-violet-500" },
  ];

  return (
    <div className="mt-2 space-y-1">
      <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Users className="size-3" /> {t.match.groupTipped(dist.total)}
      </p>
      <div className="flex h-2 overflow-hidden rounded-full bg-secondary/60">
        {segs.map((s) =>
          s.n > 0 ? (
            <div
              key={s.key}
              className={cn(s.color, "transition-all", myPick === s.key && "ring-1 ring-inset ring-white/70")}
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
