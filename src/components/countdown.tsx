"use client";

import { useEffect, useState } from "react";
import { Clock, Lock } from "lucide-react";
import { formatCountdown } from "@/lib/format";
import { useT } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

/**
 * Live-Countdown bis Tipp-Schluss. Bekommt die Lock-Zeit als ISO-String,
 * damit Server/Client konsistent rechnen (Server-Zeit ist maßgeblich für die
 * eigentliche Sperre – dies ist nur Anzeige).
 */
export function Countdown({ lockTimeIso }: { lockTimeIso: string }) {
  const t = useT();
  const lockTime = new Date(lockTimeIso).getTime();
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ms = lockTime - now;
  const locked = ms <= 0;
  const urgent = !locked && ms < 60 * 60 * 1000;
  const critical = !locked && ms < 15 * 60 * 1000;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        locked ? "text-muted-foreground" : urgent ? "text-amber-300" : "text-primary",
        critical && "rounded-full bg-amber-500/15 px-2 py-0.5 animate-glow-pulse",
      )}
    >
      {locked ? <Lock className="size-3" /> : <Clock className="size-3" />}
      {locked ? t.countdown.deadline : formatCountdown(ms)}
    </span>
  );
}
