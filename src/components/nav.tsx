"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ListChecks, Trophy, BarChart3, Shield, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/spielplan", label: "Spielplan", icon: CalendarDays },
  { href: "/meine-tipps", label: "Meine Tipps", icon: ListChecks },
  { href: "/turnier-tipps", label: "Turnier", icon: Sparkles },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/statistiken", label: "Statistiken", icon: BarChart3 },
];

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...ITEMS, { href: "/admin", label: "Admin", icon: Shield }] : ITEMS;

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
