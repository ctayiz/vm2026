"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Trophy, CheckCircle2, XCircle } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { POINTS } from "@/lib/constants";

const STORAGE_KEY = "ko_draw_modal_v1";

export function KoDrawModal() {
  const t = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setOpen(true);
      }
    } catch {
      // localStorage unavailable (private browsing etc.)
    }
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  const m = t.koModal;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? setOpen(true) : dismiss())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-pop-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl data-[state=open]:animate-pop-in">
          <div className="flex flex-col items-center gap-3 px-6 pb-2 pt-7 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Trophy className="size-7" />
            </span>
            <div className="flex items-center gap-2">
              <Dialog.Title className="text-lg font-bold">{m.title}</Dialog.Title>
              <Badge variant="success" className="text-xs">{m.newBadge}</Badge>
            </div>
            <Dialog.Description className="text-sm leading-relaxed text-muted-foreground">
              {m.intro}
            </Dialog.Description>
          </div>

          {/* Punktetabelle */}
          <div className="mx-6 mb-4 mt-3 space-y-1.5">
            <p className="text-xs font-semibold text-foreground">{m.tableLabel}</p>
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
              <div>
                <p className="text-xs font-medium text-foreground">{m.row1}</p>
                <p className="text-[10px] text-muted-foreground">{m.row1sub}</p>
              </div>
              <Badge variant="success" className="shrink-0">
                {POINTS.CORRECT_OUTCOME} Pkt.
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
              <div>
                <p className="text-xs font-medium text-foreground">{m.row2}</p>
                <p className="text-[10px] text-muted-foreground">{m.row2sub}</p>
              </div>
              <Badge variant="success" className="shrink-0">
                {POINTS.CORRECT_DRAW_KNOCKOUT} Pkt.
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2">
              <div>
                <p className="text-xs font-medium text-foreground">{m.row3}</p>
                <p className="text-[10px] text-muted-foreground">{m.row3sub}</p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {POINTS.CORRECT_DRAW_WRONG_WINNER} Pkt.
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-3 py-2">
              <div>
                <p className="text-xs font-medium text-foreground">{m.row4}</p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {POINTS.WRONG} Pkt.
              </Badge>
            </div>
            <p className="pt-1 text-[10px] leading-snug text-muted-foreground">{m.note}</p>
          </div>

          <div className="border-t border-border/60 px-5 py-3">
            <Button className="w-full" onClick={dismiss}>
              {m.cta}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
