import { Crown, Medal } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { CountUp } from "@/components/count-up";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getDictionary } from "@/lib/i18n-server";
import type { LeaderboardRow } from "@/lib/ranking";

const STYLE: Record<
  1 | 2 | 3,
  { step: string; ring: string; height: string; avatar: "lg" | "md"; medal: string }
> = {
  1: {
    step: "bg-gradient-to-b from-amber-300 to-yellow-600",
    ring: "ring-2 ring-amber-300",
    height: "h-24 sm:h-28",
    avatar: "lg",
    medal: "text-amber-300",
  },
  2: {
    step: "bg-gradient-to-b from-slate-300 to-slate-500",
    ring: "ring-2 ring-slate-300",
    height: "h-16 sm:h-20",
    avatar: "md",
    medal: "text-slate-300",
  },
  3: {
    step: "bg-gradient-to-b from-orange-400 to-amber-700",
    ring: "ring-2 ring-orange-400",
    height: "h-12 sm:h-16",
    avatar: "md",
    medal: "text-orange-400",
  },
};

function Place({ row, isMe }: { row: LeaderboardRow; isMe: boolean }) {
  const t = getDictionary();
  const place = (row.rank <= 3 ? row.rank : 3) as 1 | 2 | 3;
  const s = STYLE[place];
  return (
    <div className="flex flex-1 flex-col items-center justify-end gap-2">
      <div className="relative animate-fade-up">
        {place === 1 ? (
          <Crown className={cn("absolute -top-5 left-1/2 size-6 -translate-x-1/2 animate-float", s.medal)} />
        ) : null}
        <UserAvatar
          value={row.avatarUrl}
          name={row.displayName}
          size={s.avatar}
          className={s.ring}
        />
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center gap-1">
          <span className="max-w-[5.5rem] truncate text-sm font-semibold">{row.displayName}</span>
          {isMe && <Badge variant="default">{t.ranking.you}</Badge>}
        </div>
        <div className="text-lg font-bold tabular-nums text-primary">
          <CountUp value={row.totalPoints} />
        </div>
        <div className="text-[10px] uppercase text-muted-foreground">
          {row.correctCount} {t.ranking.correct} · {Math.round(row.accuracy * 100)}%
        </div>
      </div>

      {/* Stufe */}
      <div
        className={cn(
          "flex w-full items-start justify-center rounded-t-xl pt-1.5 text-2xl font-black text-background/80",
          s.step,
          s.height,
        )}
      >
        {place}
      </div>
    </div>
  );
}

/** Siegertreppchen für die Top 3 (Reihenfolge visuell: 2 · 1 · 3). */
export function Podium({ rows, currentUserId }: { rows: LeaderboardRow[]; currentUserId: string }) {
  const first = rows[0];
  const second = rows[1];
  const third = rows[2];
  // visuelle Anordnung: 2. links, 1. Mitte, 3. rechts
  const order = [second, first, third].filter(Boolean) as LeaderboardRow[];

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-b from-primary/5 to-card p-4 sm:p-6">
      <div className="mx-auto flex max-w-md items-end justify-center gap-2 sm:gap-4">
        {order.map((row) => (
          <Place key={row.userId} row={row} isMe={row.userId === currentUserId} />
        ))}
      </div>
    </div>
  );
}
