"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ShieldCheck, Lock, UserCheck, Database, Clock, Hand, X } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

/** Datenschutz-Hinweis als barrierefreies Modal (Anmelde-/Registrierungsseite). */
export function PrivacyDialog() {
  const t = useT();

  const sections = [
    { icon: Lock, title: t.privacy.encTitle, body: t.privacy.encBody },
    { icon: UserCheck, title: t.privacy.accessTitle, body: t.privacy.accessBody },
    { icon: Database, title: t.privacy.dataTitle, body: t.privacy.dataBody },
    { icon: Clock, title: t.privacy.retentionTitle, body: t.privacy.retentionBody, highlight: true },
    { icon: Hand, title: t.privacy.rightsTitle, body: t.privacy.rightsBody },
  ];

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ShieldCheck className="size-3.5" />
          {t.privacy.button}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-pop-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[88dvh] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl data-[state=open]:animate-pop-in"
        >
          <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <Dialog.Title className="text-base font-bold leading-tight">{t.privacy.title}</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={t.privacy.close}
                className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 overflow-y-auto px-5 py-4">
            <Dialog.Description className="text-sm text-muted-foreground">
              {t.privacy.intro}
            </Dialog.Description>

            {sections.map((s) => (
              <div key={s.title} className="flex gap-3">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                    s.highlight ? "bg-amber-400/15 text-amber-300" : "bg-secondary text-primary"
                  }`}
                >
                  <s.icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{s.title}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border/60 px-5 py-3">
            <Dialog.Close asChild>
              <Button className="w-full">{t.privacy.close}</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
