"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Heart, Trophy, ChevronLeft } from "lucide-react";
import { markFarewellModalSeenAction } from "@/server/onboarding-actions";
import { useT } from "@/components/i18n-provider";
import { HistoryView } from "@/components/history-view";
import { Button } from "@/components/ui/button";
import { burstConfetti } from "@/lib/confetti";
import type { FarewellData } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function FarewellModal({ data }: { data: FarewellData }) {
  const t = useT();
  const router = useRouter();
  const m = t.farewellModal;
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState<"thanks" | "history">("thanks");

  // Ein dezenter Konfetti-Gruß beim Öffnen (respektiert reduzierte Bewegung).
  useEffect(() => {
    const id = setTimeout(() => burstConfetti(), 200);
    return () => clearTimeout(id);
  }, []);

  const dismiss = () => {
    setOpen(false);
    void markFarewellModalSeenAction().catch(() => {});
  };
  const openFullPage = () => {
    setOpen(false);
    void markFarewellModalSeenAction().catch(() => {});
    router.push("/rueckblick");
  };

  const rank = data.recap.rank;
  const rankLabel = rank != null ? t.recap.rank(rank, data.recap.totalPlayers) : t.recap.noRank;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? setOpen(true) : dismiss())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-pop-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[86vh] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl data-[state=open]:animate-pop-in">
          <span className="shimmer-gold pointer-events-none absolute inset-0" aria-hidden />

          {step === "thanks" ? (
            <div className="relative flex flex-col overflow-y-auto px-6 pb-4 pt-7 text-center">
              <span className="mx-auto mb-4 flex size-[4.2rem] items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 text-amber-300">
                <Heart className="size-8" />
              </span>
              <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-amber-300">
                {m.eyebrow}
              </p>
              <Dialog.Title className="mt-1.5 text-2xl font-semibold tracking-tight">{m.title}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {m.body}
              </Dialog.Description>

              {data.winner && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-300/25 bg-amber-300/[0.07] px-3.5 py-3 text-left">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-300 text-background">
                    <Trophy className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[0.62rem] font-medium uppercase tracking-[0.12em] text-amber-300">
                      {m.winnerLabel}
                    </div>
                    <div className="truncate text-base font-semibold">{data.winner.displayName}</div>
                  </div>
                  <div className="ml-auto shrink-0 text-right">
                    <div className="text-lg font-semibold tabular-nums">{data.winner.totalPoints}</div>
                    <div className="text-[0.6rem] text-muted-foreground">{t.common.points}</div>
                  </div>
                </div>
              )}

              <p className="mt-3 text-sm text-muted-foreground">{m.congrats}</p>
              <p className="mt-3 text-[0.82rem] italic text-foreground/85">{m.signoff}</p>
            </div>
          ) : (
            <>
              <div className="relative flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setStep("thanks")}
                  aria-label={m.back}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-secondary"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <Dialog.Title className="min-w-0 flex-1 truncate text-base font-semibold">
                  {t.recap.title}
                </Dialog.Title>
                <span className="shrink-0 rounded-full border border-amber-300/35 bg-amber-300/15 px-2.5 py-1 text-[0.68rem] font-semibold text-amber-300">
                  {rankLabel}
                </span>
              </div>
              <div className="relative flex-1 overflow-y-auto px-4 py-3.5">
                <HistoryView data={data.recap} />
              </div>
            </>
          )}

          <div className="relative grid gap-2 border-t border-border/60 px-5 py-3.5">
            {step === "thanks" ? (
              <>
                <Button
                  className="w-full bg-amber-300 text-background hover:bg-amber-200"
                  onClick={() => setStep("history")}
                >
                  {m.cta}
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={dismiss}>
                  {m.close}
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="w-full bg-amber-300 text-background hover:bg-amber-200"
                  onClick={openFullPage}
                >
                  {m.openPage}
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={dismiss}>
                  {m.close}
                </Button>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
