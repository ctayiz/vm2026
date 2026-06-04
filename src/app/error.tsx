"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { dictionaries, DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  const match = typeof document !== "undefined" ? document.cookie.match(/wm_locale=([a-z]{2})/) : null;
  const locale = match && isLocale(match[1]) ? match[1] : DEFAULT_LOCALE;
  const t = dictionaries[locale];

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <AlertTriangle className="size-10 text-amber-300" />
      <div>
        <h1 className="text-2xl font-bold">{t.errorPage.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.errorPage.text}</p>
      </div>
      <Button onClick={reset}>{t.errorPage.retry}</Button>
    </div>
  );
}
