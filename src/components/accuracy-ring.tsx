"use client";

import { useEffect, useState } from "react";

/**
 * Animierter Kreis-Fortschritt für die Trefferquote (0..1).
 * Füllt sich beim Erscheinen sanft auf. Respektiert prefers-reduced-motion.
 */
export function AccuracyRing({
  value,
  size = 128,
  stroke = 10,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
}) {
  const [p, setP] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setP(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 1000;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      setP(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - p);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(152 76% 50%)" />
            <stop offset="100%" stopColor="hsl(190 90% 55%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold tabular-nums">{Math.round(p * 100)}%</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Quote</span>
      </div>
    </div>
  );
}
