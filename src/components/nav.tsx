"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ListChecks, Trophy, BarChart3, Shield, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n-provider";

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const t = useT();
  const ITEMS = [
    { href: "/spielplan", label: t.nav.schedule, icon: CalendarDays },
    { href: "/meine-tipps", label: t.nav.myTips, icon: ListChecks },
    { href: "/turnier-tipps", label: t.nav.tournament, icon: Sparkles },
    { href: "/ranking", label: t.nav.ranking, icon: Trophy },
    { href: "/statistiken", label: t.nav.stats, icon: BarChart3 },
  ];
  const items = isAdmin ? [...ITEMS, { href: "/admin", label: t.nav.admin, icon: Shield }] : ITEMS;

  return (
    <>
      {/* Desktop: obere Tab-Leiste */}
      <nav className="hidden gap-1 md:flex">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60",
              )}
            >
              <it.icon className="size-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile: untere Tab-Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] border-t border-border bg-card/95 backdrop-blur md:hidden">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <it.icon className="size-5" />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
