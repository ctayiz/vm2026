"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocaleAction } from "@/server/locale-actions";
import { useLocale } from "@/components/i18n-provider";
import { flagEmoji } from "@/lib/flags";
import { LOCALES, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Locale -> Flaggen-Ländercode
const LOCALE_FLAG: Record<Locale, string> = { de: "de", tr: "tr" };

/**
 * Sprachumschalter. `variant="flags"` zeigt Flaggen (🇩🇪/🇹🇷) statt der Kürzel –
 * z. B. auf der Anmeldeseite. Standard zeigt DE/TR als Text.
 */
export function LanguageToggle({
  className,
  variant = "text",
}: {
  className?: string;
  variant?: "text" | "flags";
}) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const flags = variant === "flags";

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
      {!flags && <Languages className="ml-1.5 mr-0.5 size-3.5 text-muted-foreground" />}
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => select(l)}
          disabled={pending}
          aria-pressed={l === locale}
          aria-label={l.toUpperCase()}
          className={cn(
            "rounded-full transition-colors",
            flags
              ? cn(
                  "px-1.5 py-0.5 text-lg leading-none",
                  l === locale ? "bg-primary/20 ring-1 ring-primary" : "opacity-50 hover:opacity-100",
                )
              : cn(
                  "px-2 py-0.5 text-xs font-semibold uppercase",
                  l === locale ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                ),
          )}
        >
          {flags ? flagEmoji(LOCALE_FLAG[l]) : l}
        </button>
      ))}
    </div>
  );
}
