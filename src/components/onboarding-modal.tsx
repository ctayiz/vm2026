"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Target, Sparkles, Star, ArrowRight, ArrowLeft } from "lucide-react";
import { completeOnboardingAction } from "@/server/onboarding-actions";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

/**
 * Einmaliger Willkommens-/Erklär-Flow. Sichtbarkeit wird PRO ACCOUNT in der DB
 * gemerkt (user.onboardedAt) – nicht via localStorage, damit es zuverlässig nur
 * einmal erscheint (localStorage wird auf iOS-Safari teils gelöscht).
 */
export function OnboardingModal({ initialOpen }: { initialOpen: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(initialOpen);
  const [step, setStep] = useState(0);

  const steps = [
    { icon: Target, title: t.onboarding.s1Title, body: t.onboarding.s1Body },
    { icon: Sparkles, title: t.onboarding.s2Title, body: t.onboarding.s2Body },
    { icon: Star, title: t.onboarding.s3Title, body: t.onboarding.s3Body },
  ];
  const isLast = step === steps.length - 1;
  const s = steps[step];

  const finish = () => {
    setOpen(false);
    // serverseitig pro Account merken (Fehler ignorieren – schließt trotzdem)
    void completeOnboardingAction().catch(() => {});
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? setOpen(true) : finish())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-pop-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl data-[state=open]:animate-pop-in">
          <div className="flex flex-col items-center gap-3 px-6 pb-2 pt-7 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <s.icon className="size-7" />
            </span>
            <Dialog.Title className="text-lg font-bold">{s.title}</Dialog.Title>
            <Dialog.Description className="text-sm leading-relaxed text-muted-foreground">
              {s.body}
            </Dialog.Description>
          </div>

          {/* Schritt-Punkte */}
          <div className="flex justify-center gap-1.5 py-4">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-5 bg-primary" : "w-1.5 bg-secondary"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-border/60 px-5 py-3">
            {step > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setStep((x) => x - 1)}>
                <ArrowLeft className="size-4" /> {t.onboarding.back}
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={finish}>
                {t.onboarding.skip}
              </Button>
            )}
            <Button
              className="ml-auto"
              onClick={() => (isLast ? finish() : setStep((x) => x + 1))}
            >
              {isLast ? t.onboarding.start : t.onboarding.next}
              {!isLast && <ArrowRight className="size-4" />}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
