"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Globe, X } from "lucide-react";
import { flagEmoji } from "@/lib/flags";
import { useT } from "@/components/i18n-provider";

export interface TeamFilterOption {
  code: string;
  name: string;
  flagCode: string | null;
  group: string | null;
}

/**
 * Länder-Filter: filtert den Spielplan auf die Spiele einer Mannschaft.
 * Aktualisiert den ?team=CODE-Parameter und erhält andere Filter (?filter=…).
 */
export function TeamFilter({ teams, paramKey = "team" }: { teams: TeamFilterOption[]; paramKey?: string }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(paramKey) ?? "";

  const navigate = (code: string) => {
    const sp = new URLSearchParams(params.toString());
    if (code) sp.set(paramKey, code);
    else sp.delete(paramKey);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // nach Gruppe gruppieren
  const groups = new Map<string, TeamFilterOption[]>();
  for (const team of teams) {
    const g = team.group ? t.favorites.group(team.group) : t.favorites.other;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(team);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 sm:max-w-xs">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg">
          {current ? flagEmoji(teams.find((tm) => tm.code === current)?.flagCode) : <Globe className="size-4 text-muted-foreground" />}
        </span>
        <select
          value={current}
          onChange={(e) => navigate(e.target.value)}
          aria-label={t.schedule.filterByCountry}
          className="h-10 w-full rounded-lg border border-input bg-background/60 pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">{t.schedule.allCountries}</option>
          {[...groups.entries()].map(([label, ts]) => (
            <optgroup key={label} label={label}>
              {ts.map((tm) => (
                <option key={tm.code} value={tm.code}>
                  {tm.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      {current && (
        <button
          type="button"
          onClick={() => navigate("")}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary"
        >
          <X className="size-4" /> {t.schedule.filter}
        </button>
      )}
    </div>
  );
}
