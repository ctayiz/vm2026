"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n-provider";

// Anpfiff WM 2026: Eröffnungsspiel 11.06.2026, 13:00 Uhr Ortszeit (Mexiko-Stadt) = 19:00 UTC.
const KICKOFF = Date.UTC(2026, 5, 11, 19, 0, 0);

function box(value: number, label: string) {
  return (
    <div className="flex flex-col items-center">
      <div className="glass flex min-w-[3.25rem] items-center justify-center rounded-xl px-3 py-2 text-2xl font-bold tabular-nums text-foreground sm:min-w-[4rem] sm:text-3xl">
        {String(value).padStart(2, "0")}
      </div>
      <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

export function KickoffCountdown() {
  const t = useT();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // bis zur Hydration nichts rendern (vermeidet SSR/Client-Mismatch)
  if (now === null) {
    return <div className="h-[68px]" aria-hidden />;
  }

  const ms = KICKOFF - now;
  if (ms <= 0) {
    return (
      <div className="glass inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-primary">
        <span className="size-2 animate-glow-pulse rounded-full bg-primary" />
        {t.countdown.running}
      </div>
    );
  }

  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {box(d, t.countdown.days)}
      <span className="pb-5 text-2xl font-bold text-muted-foreground">:</span>
      {box(h, t.countdown.hours)}
      <span className="pb-5 text-2xl font-bold text-muted-foreground">:</span>
      {box(m, t.countdown.min)}
      <span className="pb-5 text-2xl font-bold text-muted-foreground">:</span>
      {box(s, t.countdown.sec)}
    </div>
  );
}
