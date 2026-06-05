"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Trophy, Shield, Sparkles, User, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n-provider";
import { BracketIcon } from "@/components/bracket-icon";

type SubItem = { href: string; label: string };
type Item =
  | { kind: "link"; href: string; label: string; icon?: React.ElementType }
  | { kind: "group"; key: string; label: string; icon: React.ElementType; children: SubItem[] };

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const t = useT();
  const [open, setOpen] = useState<string | null>(null);

  // Bei Navigation Dropdown schließen
  useEffect(() => setOpen(null), [pathname]);

  const items: Item[] = [
    { kind: "link", href: "/spielplan", label: t.nav.schedule, icon: CalendarDays },
    { kind: "link", href: "/turnier-tipps", label: t.nav.bonus, icon: Sparkles },
    { kind: "link", href: "/ranking", label: t.nav.ranking, icon: Trophy },
    {
      kind: "group",
      key: "meins",
      label: t.nav.meins,
      icon: User,
      children: [
        { href: "/statistiken", label: t.nav.stats },
        { href: "/meine-tipps", label: t.nav.myTips },
      ],
    },
    { kind: "link", href: "/turnierbaum", label: t.nav.bracket, icon: BracketIcon },
    ...(isAdmin ? [{ kind: "link" as const, href: "/admin", label: t.nav.admin, icon: Shield }] : []),
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const groupActive = (g: Extract<Item, { kind: "group" }>) => g.children.some((c) => isActive(c.href));

  return (
    <>
      {/* Desktop: obere Leiste */}
      <nav className="hidden items-center gap-1 md:flex">
        {items.map((it) =>
          it.kind === "link" ? (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(it.href) ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60",
              )}
            >
              {it.icon && <it.icon className="size-4" />}
              {it.label}
            </Link>
          ) : (
            <div key={it.key} className="relative">
              <button
                type="button"
                onClick={() => setOpen(open === it.key ? null : it.key)}
                aria-expanded={open === it.key}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  groupActive(it) || open === it.key
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60",
                )}
              >
                <it.icon className="size-4" />
                {it.label}
                <ChevronDown className={cn("size-3.5 transition-transform", open === it.key && "rotate-180")} />
              </button>
              {open === it.key && (
                <div className="absolute left-0 top-full z-50 mt-1 min-w-44 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
                  {it.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      className={cn(
                        "block px-3 py-2 text-sm transition-colors hover:bg-secondary",
                        isActive(c.href) ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
      </nav>

      {/* Klick-außerhalb schließt das Desktop-Dropdown */}
      {open && <div className="fixed inset-0 z-30 hidden md:block" onClick={() => setOpen(null)} />}

      {/* Mobile: untere Tab-Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] border-t border-border bg-card/95 backdrop-blur md:hidden">
        {items.map((it) =>
          it.kind === "link" ? (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                isActive(it.href) ? "text-primary" : "text-muted-foreground",
              )}
            >
              {it.icon ? (
                <>
                  <it.icon className="size-5" />
                  {it.label}
                </>
              ) : (
                <span className="px-1 text-center leading-tight">{it.label}</span>
              )}
            </Link>
          ) : (
            <button
              key={it.key}
              type="button"
              onClick={() => setOpen(open === it.key ? null : it.key)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                groupActive(it) || open === it.key ? "text-primary" : "text-muted-foreground",
              )}
            >
              <it.icon className="size-5" />
              {it.label}
            </button>
          ),
        )}
      </nav>

      {/* Mobile-Dropdown-Panel (öffnet über der Tab-Bar) */}
      {open &&
        (() => {
          const g = items.find((i) => i.kind === "group" && i.key === open) as
            | Extract<Item, { kind: "group" }>
            | undefined;
          if (!g) return null;
          return (
            <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(null)}>
              <div className="absolute inset-x-3 bottom-16 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
                {g.children.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className={cn(
                      "block px-4 py-3 text-sm transition-colors hover:bg-secondary",
                      isActive(c.href) ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}
    </>
  );
}
