import Link from "next/link";
import { Layers, BarChart3, Sparkles, Trophy } from "lucide-react";
import { BracketIcon } from "@/components/bracket-icon";
import { getDictionary } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";

export function DashboardHero({
  name,
  openCount,
  tipped = 0,
  totalMatches = 0,
}: {
  name: string;
  openCount: number;
  tipped?: number;
  totalMatches?: number;
}) {
  const t = getDictionary();
  const pct = totalMatches > 0 ? Math.round((tipped / totalMatches) * 100) : 0;

  const tiles = [
    { href: "/wm/gruppen", icon: Layers, label: t.nav.groups, cls: "text-sky-400" },
    { href: "/turnierbaum", icon: BracketIcon, label: t.nav.bracket, cls: "text-violet-400" },
    { href: "/statistiken", icon: BarChart3, label: t.nav.stats, cls: "text-primary" },
    { href: "/ranking", icon: Trophy, label: t.nav.ranking, cls: "text-amber-300" },
  ];

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

        <div className="grid grid-cols-4 gap-2">
          {tiles.map(({ href, icon: Icon, label, cls }) => (
            <Link key={href} href={href} className="group">
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border/60 bg-secondary/30 px-1 py-2.5 text-center transition-colors hover:bg-secondary/60">
                <Icon className={cn("size-5", cls)} />
                <span className="text-[10px] font-medium leading-tight text-muted-foreground transition-colors group-hover:text-foreground">
                  {label}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {totalMatches > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <span>{t.dashboard.tipProgress}</span>
              <span className="tabular-nums text-foreground">
                {tipped}/{totalMatches} · {pct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-[width] duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
