import { requireUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, Medal } from "lucide-react";
import { CountUp } from "@/components/count-up";
import { RankCelebration } from "@/components/rank-celebration";
import { RankDelta } from "@/components/rank-delta";
import { ShareResultButton } from "@/components/share-result-button";
import { Podium } from "@/components/podium";
import { getDictionary } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";
import type { LeaderboardRow } from "@/lib/ranking";

export const dynamic = "force-dynamic";

function Formkurve({ points }: { points: number[] }) {
  if (points.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-1">
      {points
        .slice()
        .reverse()
        .map((p, i) => (
          <span
            key={i}
            title={`${p} Punkte`}
            className={cn("size-2.5 rounded-full", p > 0 ? "bg-primary" : "bg-muted-foreground/40")}
          />
        ))}
    </div>
  );
}

const rankColor = ["text-amber-300", "text-slate-300", "text-orange-400"];

function Row({ row, isMe, index }: { row: LeaderboardRow; isMe: boolean; index: number }) {
  const t = getDictionary();
  const top3 = row.rank <= 3;
  const isLeader = row.rank === 1;
  return (
    <Card
      className={cn(
        "card-hover animate-fade-up relative overflow-hidden",
        isMe && "border-primary/60 ring-1 ring-primary/40",
        isLeader && "border-amber-400/50",
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 50}ms` }}
    >
      {isLeader && <span className="shimmer-gold pointer-events-none absolute inset-0" />}
      <CardContent className="relative flex items-center gap-3 py-3">
        <div className="flex w-7 shrink-0 flex-col items-center justify-center gap-0.5">
          {top3 ? (
            row.rank === 1 ? (
              <Crown className={cn("size-5 animate-float", rankColor[0])} />
            ) : (
              <Medal className={cn("size-5", rankColor[row.rank - 1])} />
            )
          ) : (
            <span className="text-sm font-bold text-muted-foreground tabular-nums">{row.rank}</span>
          )}
          <RankDelta delta={row.rankDelta} />
        </div>

        <UserAvatar
          value={row.avatarUrl}
          name={row.displayName}
          size="md"
          className={cn(isLeader && "ring-2 ring-amber-400/70")}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{row.displayName}</span>
            {isMe && <Badge variant="default">{t.ranking.you}</Badge>}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{row.correctCount} {t.ranking.correct}</span>
            <span>{Math.round(row.accuracy * 100)}% {t.ranking.quote}</span>
            <Formkurve points={row.recentPoints} />
          </div>
        </div>

        <div className="text-right">
          <div className={cn("text-lg font-bold tabular-nums text-primary", isLeader && "text-glow")}>
            <CountUp value={row.totalPoints} />
          </div>
          <div className="text-[10px] uppercase text-muted-foreground">{t.ranking.points}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function RankingPage() {
  const user = await requireUser();
  const t = getDictionary();
  const board = await getLeaderboard();
  const myRow = board.find((r) => r.userId === user.id);
  const iAmLeader = myRow?.rank === 1 && myRow.totalPoints > 0;

  const top3 = board.slice(0, 3);
  const rest = board.slice(3);

  return (
    <div className="space-y-5">
      <RankCelebration active={!!iAmLeader} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.ranking.title}</h1>
          <p className="text-sm text-muted-foreground">
            {t.ranking.subtitle(board.length)}
          </p>
        </div>
        {myRow && (
          <ShareResultButton
            name={myRow.displayName}
            rank={myRow.rank}
            totalPlayers={board.length}
            points={myRow.totalPoints}
            accuracyPct={Math.round(myRow.accuracy * 100)}
          />
        )}
      </div>

      {top3.length > 0 && <Podium rows={top3} currentUserId={user.id} />}

      {rest.length > 0 && (
        <div className="space-y-2">
          {rest.map((row, i) => (
            <Row key={row.userId} row={row} isMe={row.userId === user.id} index={i} />
          ))}
        </div>
      )}

      {board.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t.ranking.empty}
        </p>
      )}
    </div>
  );
}
