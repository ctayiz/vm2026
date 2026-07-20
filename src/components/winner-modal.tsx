"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Trophy } from "lucide-react";
import { markWinnerModalSeenAction } from "@/server/onboarding-actions";
import { useT } from "@/components/i18n-provider";
import { Flag } from "@/components/flag";
import { Button } from "@/components/ui/button";
import type { FinaleCelebration } from "@/lib/queries";
import { cn } from "@/lib/utils";

const CONFETTI_COLORS = [
  "hsl(45 90% 70%)",
  "hsl(152 76% 52%)",
  "hsl(210 40% 96%)",
  "hsl(28 62% 60%)",
  "hsl(200 85% 62%)",
];

/** Konfetti auf einem Canvas – bei reduzierter Bewegung komplett aus. */
function Confetti({ burst }: { burst: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const bits = useRef<
    { x: number; y: number; vx: number; vy: number; s: number; r: number; vr: number; c: string; life: number }[]
  >([]);
  const raf = useRef<number | null>(null);

  const tick = useCallback(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    ctx.clearRect(0, 0, w, h);
    bits.current = bits.current.filter((b) => b.life < 380 && b.y < h + 40);
    for (const b of bits.current) {
      b.life++;
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.026;
      b.r += b.vr;
      b.vx *= 0.996;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.r);
      ctx.globalAlpha = Math.max(0, 1 - b.life / 380);
      ctx.fillStyle = b.c;
      ctx.fillRect(-b.s / 2, -b.s / 2, b.s, b.s * 0.62);
      ctx.restore();
    }
    raf.current = bits.current.length ? requestAnimationFrame(tick) : null;
    if (!raf.current) ctx.clearRect(0, 0, w, h);
  }, []);

  useEffect(() => {
    if (burst === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = cv.clientWidth * dpr;
    cv.height = cv.clientHeight * dpr;
    cv.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = cv.clientWidth;
    for (let i = 0; i < 90; i++) {
      bits.current.push({
        x: w * (0.15 + Math.random() * 0.7),
        y: -20 - Math.random() * 80,
        vx: (Math.random() - 0.5) * 2.4,
        vy: 1.6 + Math.random() * 2.4,
        s: 4 + Math.random() * 5,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.22,
        c: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
        life: 0,
      });
    }
    if (!raf.current) raf.current = requestAnimationFrame(tick);
  }, [burst, tick]);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    [],
  );

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-50 h-full w-full" />;
}

const MEDAL = ["bg-amber-300", "bg-slate-300", "bg-amber-600"];
const PLINTH = ["h-[4.6rem] border-amber-300/35 bg-amber-300/15", "h-[3.3rem]", "h-[2.6rem]"];

export function WinnerModal({ data }: { data: FinaleCelebration }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [burst, setBurst] = useState(1);

  const m = t.winnerModal;
  const f = data.final;
  const pens = f.decider === "PEN" && f.homePenalties != null && f.awayPenalties != null;
  const deciderLabel =
    f.decider === "PEN" ? t.bracket.afterPenalties : f.decider === "AET" ? t.bracket.afterExtraTime : null;

  const dismiss = () => {
    setOpen(false);
    // Nach dem Bestätigen den Layout-Server-Teil neu rendern, damit direkt
    // danach das Danke-/Abschluss-Modal (Familie Tayiz) erscheinen kann.
    void markWinnerModalSeenAction()
      .catch(() => {})
      .finally(() => router.refresh());
  };
  const advance = () => {
    if (step === 1) {
      setStep(2);
      setBurst((b) => b + 1);
    } else {
      dismiss();
    }
  };

  // Podest-Reihenfolge: 2. links, 1. mittig (erhöht), 3. rechts.
  const order = [data.top3[1], data.top3[0], data.top3[2]];

  return (
    <>
      {open && <Confetti burst={burst} />}
      <Dialog.Root open={open} onOpenChange={(o) => (o ? setOpen(true) : dismiss())}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-pop-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl data-[state=open]:animate-pop-in">
            <span className="shimmer-gold pointer-events-none absolute inset-0" aria-hidden />

            {step === 1 ? (
              <div className="relative px-6 pb-4 pt-7 text-center">
                <span className="mx-auto mb-4 flex size-[4.6rem] items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 text-amber-300">
                  <Trophy className="size-9" />
                </span>
                <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-amber-300">
                  {m.championEyebrow}
                </p>
                <Flag code={data.champion.flagCode} className="mt-1 block text-[2.6rem]" />
                <Dialog.Title className="mt-1 text-2xl font-semibold tracking-tight">
                  {data.champion.name}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  {m.championSub}
                </Dialog.Description>

                <div className="mt-5 flex items-center justify-center gap-3 tabular-nums">
                  <span className="min-w-[5.2rem] text-right text-xs text-muted-foreground">{f.homeName}</span>
                  <span className="text-[1.75rem] font-semibold tracking-tight">
                    {f.homeGoals}&nbsp;:&nbsp;{f.awayGoals}
                  </span>
                  <span className="min-w-[5.2rem] text-left text-xs text-muted-foreground">{f.awayName}</span>
                </div>
                {pens && (
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    {f.homePenalties} : {f.awayPenalties}
                  </p>
                )}
                <span className="mt-2 inline-block rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-0.5 text-[0.72rem] text-amber-300">
                  {m.finalLabel}
                  {deciderLabel ? ` · ${deciderLabel}` : ""}
                </span>
              </div>
            ) : (
              <div className="relative px-6 pb-4 pt-7 text-center">
                <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-amber-300">
                  {m.standingsEyebrow}
                </p>
                <Dialog.Title className="mt-2 text-2xl font-semibold tracking-tight">
                  {m.standingsTitle}
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                  {m.standingsSub}
                </Dialog.Description>

                <div className="mt-6 grid grid-cols-[1fr_1.15fr_1fr] items-end gap-2">
                  {order.map((row, i) =>
                    row ? (
                      <div
                        key={row.rank}
                        className="flex animate-pop-in flex-col items-center gap-2"
                        style={{ animationDelay: `${[0.14, 0, 0.28][i]}s` }}
                      >
                        <span
                          className={cn(
                            "flex size-8 items-center justify-center rounded-full text-sm font-semibold text-background",
                            MEDAL[row.rank - 1],
                          )}
                        >
                          {row.rank}
                        </span>
                        <span className="break-words text-center text-xs font-medium leading-tight">
                          {row.displayName}
                        </span>
                        <span
                          className={cn(
                            "text-lg font-semibold tabular-nums",
                            row.rank === 1 && "text-amber-300",
                          )}
                        >
                          {row.totalPoints}
                        </span>
                        <span className="text-[0.66rem] tabular-nums text-muted-foreground">
                          {row.matchPoints} + {row.bonusPoints}
                        </span>
                        <div
                          className={cn(
                            "w-full rounded-t-lg border border-b-0 border-border bg-secondary/60",
                            PLINTH[row.rank - 1],
                          )}
                        />
                      </div>
                    ) : (
                      <div key={i} />
                    ),
                  )}
                </div>
                <p className="mt-4 text-[0.66rem] text-muted-foreground">{m.pointsNote}</p>
              </div>
            )}

            <div className="relative flex justify-center gap-1.5 pb-3" aria-hidden>
              <span className={cn("h-1.5 rounded-full transition-all", step === 1 ? "w-4 bg-amber-300" : "w-1.5 bg-secondary")} />
              <span className={cn("h-1.5 rounded-full transition-all", step === 2 ? "w-4 bg-amber-300" : "w-1.5 bg-secondary")} />
            </div>
            <div className="relative border-t border-border/60 px-5 py-3">
              <Button
                className="w-full bg-amber-300 text-background hover:bg-amber-200"
                onClick={advance}
              >
                {step === 1 ? m.next : m.close}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
