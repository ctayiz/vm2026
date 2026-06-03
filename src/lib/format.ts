// Datums-/Zeit-Formatierung in deutscher Zeitzone (Europe/Berlin), sprachabhängig.

import type { Locale } from "./i18n";

const TZ = "Europe/Berlin";

const intl = (locale: Locale) => (locale === "tr" ? "tr-TR" : "de-DE");

const WORDS: Record<Locale, { today: string; tomorrow: string; uhr: string }> = {
  de: { today: "Heute", tomorrow: "Morgen", uhr: " Uhr" },
  tr: { today: "Bugün", tomorrow: "Yarın", uhr: "" },
};

function dateFmt(locale: Locale) {
  return new Intl.DateTimeFormat(intl(locale), {
    timeZone: TZ,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
function timeFmt(locale: Locale) {
  return new Intl.DateTimeFormat(intl(locale), { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}
function dayLabelFmt(locale: Locale) {
  return new Intl.DateTimeFormat(intl(locale), {
    timeZone: TZ,
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

const dayKeyFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDate(d: Date, locale: Locale = "de"): string {
  return dateFmt(locale).format(d);
}

export function formatTime(d: Date, locale: Locale = "de"): string {
  return `${timeFmt(locale).format(d)}${WORDS[locale].uhr}`;
}

export function formatDateTime(d: Date, locale: Locale = "de"): string {
  return `${dateFmt(locale).format(d)}, ${formatTime(d, locale)}`;
}

/** Stabiler Tages-Schlüssel (YYYY-MM-DD) in Berliner Zeit, zum Gruppieren. */
export function dayKey(d: Date): string {
  const parts = dayKeyFmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Menschenlesbares Tages-Label mit Heute/Morgen-Erkennung. */
export function dayLabel(d: Date, locale: Locale = "de", now: Date = new Date()): string {
  const k = dayKey(d);
  if (k === dayKey(now)) return WORDS[locale].today;
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (k === dayKey(tomorrow)) return WORDS[locale].tomorrow;
  return dayLabelFmt(locale).format(d);
}

/** ms -> Countdown-String. */
export function formatCountdown(ms: number, deadlineLabel = "Tipp-Schluss"): string {
  if (ms <= 0) return deadlineLabel;
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}T ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `0:${String(s).padStart(2, "0")}`;
}
