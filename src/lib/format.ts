// Datums-/Zeit-Formatierung in deutscher Zeitzone (Europe/Berlin).

const TZ = "Europe/Berlin";

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: TZ,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});

const dayKeyFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dayLabelFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: TZ,
  weekday: "long",
  day: "2-digit",
  month: "long",
});

export function formatDate(d: Date): string {
  return dateFmt.format(d);
}

export function formatTime(d: Date): string {
  return `${timeFmt.format(d)} Uhr`;
}

export function formatDateTime(d: Date): string {
  return `${dateFmt.format(d)}, ${timeFmt.format(d)} Uhr`;
}

/** Stabiler Tages-Schlüssel (YYYY-MM-DD) in Berliner Zeit, zum Gruppieren. */
export function dayKey(d: Date): string {
  // de-DE liefert TT.MM.JJJJ -> in ISO-artigen Key drehen
  const parts = dayKeyFmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Menschenlesbares Tages-Label mit Heute/Morgen-Erkennung. */
export function dayLabel(d: Date, now: Date = new Date()): string {
  const k = dayKey(d);
  if (k === dayKey(now)) return "Heute";
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (k === dayKey(tomorrow)) return "Morgen";
  return dayLabelFmt.format(d);
}

/** ms -> "2T 4h", "3h 12m", "12m 30s", "00:45" für Countdown. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "Tipp-Schluss";
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
