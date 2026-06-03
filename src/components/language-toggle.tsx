"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocaleAction } from "@/server/locale-actions";
import { useLocale } from "@/components/i18n-provider";
import { LOCALES, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** DE/TR-Umschalter. `variant="plain"` für dezente Darstellung im Header. */
export function LanguageToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();

  const select = (l: Locale) => {
    if (l === locale) return;
    start(async () => {
      await setLocaleAction(l);
      router.refresh();
    });
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border bg-secondary/40 p-0.5",
        className,
      )}
      role="group"
      aria-label="Sprache / Dil"
    >
      <Languages className="ml-1.5 mr-0.5 size-3.5 text-muted-foreground" />
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => select(l)}
          disabled={pending}
          aria-pressed={l === locale}
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold uppercase transition-colors",
            l === locale
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
