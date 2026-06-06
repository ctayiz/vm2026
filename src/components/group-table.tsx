import Link from "next/link";
import { Flag } from "@/components/flag";
import { Card } from "@/components/ui/card";
import { getDictionary } from "@/lib/i18n-server";
import type { StandingRow } from "@/lib/standings";
import { cn } from "@/lib/utils";

const GRID = "grid grid-cols-[1.5rem_1fr_2rem_2.75rem_2rem] items-center gap-1.5";

/** Tabelle einer einzelnen Gruppe. Team-Namen verlinken aufs Team-Profil. */
export function GroupTable({ group, rows, index = 0 }: { group: string; rows: StandingRow[]; index?: number }) {
  const t = getDictionary();
  return (
    <Card
      className="animate-fade-up overflow-hidden"
      style={{ animationDelay: `${Math.min(index, 12) * 50}ms` }}
    >
      <div className="border-b border-border/60 bg-secondary/30 px-3 py-2">
        <span className="text-sm font-bold">
          {t.wm.group} {group}
        </span>
      </div>

      <div className={cn(GRID, "px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground")}>
        <span />
        <span>{t.wm.colTeam}</span>
        <span className="text-center">{t.wm.colPlayed}</span>
        <span className="text-center">{t.wm.colGd}</span>
        <span className="text-center">{t.wm.colPts}</span>
      </div>

      <div className="divide-y divide-border/40">
        {rows.map((r) => {
          const rankColor =
            r.rank <= 2 ? "text-primary" : r.rank === 3 ? "text-amber-300" : "text-muted-foreground";
          return (
            <Link
              key={r.code}
              href={`/team/${r.code}`}
              className={cn(GRID, "px-3 py-2 transition-colors hover:bg-secondary/40")}
            >
              <span className={cn("text-center text-sm font-bold tabular-nums", rankColor)}>{r.rank}</span>
              <span className="flex min-w-0 items-center gap-1.5">
                <Flag code={r.flagCode} className="text-base" />
                <span className="truncate text-sm font-medium">{r.name}</span>
              </span>
              <span className="text-center text-sm tabular-nums text-muted-foreground">{r.played}</span>
              <span className="text-center text-sm tabular-nums text-muted-foreground">
                {r.gd > 0 ? "+" : ""}
                {r.gd}
              </span>
              <span className="text-center text-sm font-bold tabular-nums">{r.points}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
