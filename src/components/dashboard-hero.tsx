import Link from "next/link";
import { Trophy, Target, ListChecks, ArrowRight } from "lucide-react";
import { CountUp } from "@/components/count-up";
import { getDictionary } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";

function Chip({
  icon: Icon,
  value,
  label,
  href,
  highlight,
}: {
  icon: React.ElementType;
  value: React.ReactNode;
  label: string;
  href?: string;
  highlight?: boolean;
}) {
  const inner = (
    <div
      className={cn(
        "glass flex items-center gap-3 rounded-xl px-4 py-3 transition-colors",
        href && "hover:border-primary/40",
        highlight && "border-primary/40 bg-primary/10",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          highlight ? "bg-primary/20 text-primary" : "bg-secondary text-primary",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <div className="text-lg font-bold leading-none tabular-nums">{value}</div>
        <div className="mt-0.5 truncate text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      </div>
      {href && <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground" />}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function DashboardHero({
  name,
  points,
  rank,
  totalPlayers,
  openCount,
}: {
  name: string;
  points: number;
  rank: number | null;
  totalPlayers: number;
  openCount: number;
}) {
  const t = getDictionary();
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
      <div className="blob right-[-20%] top-[-60%] h-48 w-48 animate-blob bg-primary/30" />
      <div className="relative space-y-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {t.dashboard.hello} <span className="text-gradient">{name}</span> 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {openCount > 0 ? t.dashboard.openTipsMsg(openCount) : t.dashboard.allTipped}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Chip
            icon={Trophy}
            value={rank ? `#${rank}` : "—"}
            label={t.dashboard.rankSub(totalPlayers)}
            href="/ranking"
            highlight={rank === 1}
          />
          <Chip icon={Target} value={<CountUp value={points} />} label={t.ranking.points} href="/statistiken" />
          <Chip
            icon={ListChecks}
            value={openCount}
            label={t.dashboard.openTips}
            href="/spielplan?filter=offen"
            highlight={openCount > 0}
          />
        </div>
      </div>
    </div>
  );
}
