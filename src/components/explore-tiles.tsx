import Link from "next/link";
import {
  Sparkles,
  Trophy,
  BarChart3,
  ListChecks,
  Layers,
  Building2,
  History,
  ArrowUpRight,
} from "lucide-react";
import { BracketIcon } from "@/components/bracket-icon";
import { getDictionary } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";

const ACCENT: Record<string, string> = {
  amber: "bg-amber-400/15 text-amber-300",
  sky: "bg-sky-500/15 text-sky-400",
  primary: "bg-primary/15 text-primary",
  violet: "bg-violet-500/15 text-violet-400",
  emerald: "bg-emerald-500/15 text-emerald-400",
};

/** Moderne Kachel-Übersicht aller Bereiche – Schnellzugriff auf der Startseite. */
export function ExploreTiles() {
  const t = getDictionary();
  const tiles = [
    { href: "/turnier-tipps", icon: Sparkles, title: t.nav.bonus, sub: t.explore.bonusSub, accent: "amber" },
    { href: "/ranking", icon: Trophy, title: t.nav.ranking, sub: t.explore.rankingSub, accent: "amber" },
    { href: "/statistiken", icon: BarChart3, title: t.nav.stats, sub: t.explore.statsSub, accent: "sky" },
    { href: "/meine-tipps", icon: ListChecks, title: t.nav.myTips, sub: t.explore.myTipsSub, accent: "primary" },
    { href: "/turnierbaum", icon: BracketIcon, title: t.nav.bracket, sub: t.explore.bracketSub, accent: "violet" },
    { href: "/wm/gruppen", icon: Layers, title: t.nav.groups, sub: t.explore.groupsSub, accent: "sky" },
    { href: "/wm/stadien", icon: Building2, title: t.nav.venues, sub: t.explore.venuesSub, accent: "emerald" },
    { href: "/wm/history", icon: History, title: t.nav.history, sub: t.explore.historySub, accent: "amber" },
  ];

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t.explore.title}
      </h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tile, i) => (
          <Link key={tile.href} href={tile.href} className="group">
            <div
              className="card-hover animate-fade-up glass flex h-full flex-col rounded-xl p-3.5"
              style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
            >
              <div className="mb-2.5 flex items-start justify-between">
                <span className={cn("flex size-9 items-center justify-center rounded-lg", ACCENT[tile.accent])}>
                  <tile.icon className="size-5" />
                </span>
                <ArrowUpRight className="size-4 text-muted-foreground/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
              </div>
              <div className="font-semibold leading-tight">{tile.title}</div>
              <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{tile.sub}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
