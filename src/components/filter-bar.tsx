"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

export function FilterBar({ options, paramKey = "filter" }: { options: FilterOption[]; paramKey?: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(paramKey) ?? options[0]?.value;

  // Hilfsfunktion: aktuellen Querystring übernehmen und nur paramKey ändern,
  // damit andere Filter (z. B. Länder-Filter) erhalten bleiben.
  const hrefFor = (value: string) => {
    const sp = new URLSearchParams(params.toString());
    if (value === options[0]?.value) sp.delete(paramKey);
    else sp.set(paramKey, value);
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div className="flex flex-wrap gap-2 overflow-x-auto">
      {options.map((opt) => {
        const active = current === opt.value;
        return (
          <Link
            key={opt.value}
            href={hrefFor(opt.value)}
            scroll={false}
            className={cn(
              "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary",
            )}
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}
