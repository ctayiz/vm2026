"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Check, Lock } from "lucide-react";
import { submitPredictionAction, type PredictionState } from "@/server/prediction-actions";
import type { Prediction } from "@/lib/constants";
import { burstConfetti } from "@/lib/confetti";
import { tapHaptic, successHaptic } from "@/lib/haptics";
import { useT } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Prediction; label: string }[] = [
  { value: "HOME_WIN", label: "1" },
  { value: "DRAW", label: "X" },
  { value: "AWAY_WIN", label: "2" },
];

function OptionButton({
  value,
  label,
  selected,
  locked,
  compact,
  flash,
}: {
  value: Prediction;
  label: string;
  selected: boolean;
  locked: boolean;
  compact?: boolean;
  flash?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="prediction"
      value={value}
      onClick={() => !locked && tapHaptic()}
      disabled={locked || pending}
      aria-pressed={selected}
      className={cn(
        "flex-1 rounded-lg border font-bold transition-all active:scale-95",
        compact ? "py-1 text-xs" : "py-2.5 text-sm",
        "disabled:cursor-not-allowed",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
          : "border-border bg-secondary/40 text-foreground hover:border-primary/60 hover:bg-secondary",
        locked && !selected && "opacity-40",
        flash && "animate-tick-pop",
      )}
    >
      {label}
    </button>
  );
}

export function PredictionPicker({
  matchId,
  initialPrediction,
  locked,
  homeShort,
  awayShort,
  compact = false,
  allowDraw = true,
}: {
  matchId: string;
  initialPrediction: Prediction | null;
  locked: boolean;
  homeShort: string;
  awayShort: string;
  compact?: boolean;
  allowDraw?: boolean;
}) {
  const t = useT();
  const [state, formAction] = useFormState<PredictionState, FormData>(submitPredictionAction, {
    ok: false,
  });
  const [justSaved, setJustSaved] = useState(false);

  // aktuelle Auswahl: optimistisch das Ergebnis der Action, sonst initial
  const current = state.prediction ?? initialPrediction;

  useEffect(() => {
    if (state.ok) {
      setJustSaved(true);
      burstConfetti();
      successHaptic();
      const timer = setTimeout(() => setJustSaved(false), 1600);
      return () => clearTimeout(timer);
    }
  }, [state]);

  return (
    <form action={formAction} className={compact ? "space-y-1" : "space-y-2"}>
      <input type="hidden" name="matchId" value={matchId} />
      <div className={cn("flex items-center", compact ? "gap-1" : "gap-2")}>
        <OptionButton value="HOME_WIN" label={homeShort} selected={current === "HOME_WIN"} locked={locked} compact={compact} flash={justSaved && current === "HOME_WIN"} />
        {allowDraw && (
          <OptionButton value="DRAW" label="X" selected={current === "DRAW"} locked={locked} compact={compact} flash={justSaved && current === "DRAW"} />
        )}
        <OptionButton value="AWAY_WIN" label={awayShort} selected={current === "AWAY_WIN"} locked={locked} compact={compact} flash={justSaved && current === "AWAY_WIN"} />
      </div>

      {compact ? (
        // schlanke Rückmeldung im Mini-Modus
        justSaved ? (
          <p className="flex animate-pop-in items-center gap-1 text-[10px] font-medium text-primary">
            <Check className="size-3" /> {t.common.saved}
          </p>
        ) : state.error ? (
          <p className="text-[10px] text-red-300">{state.error}</p>
        ) : locked ? (
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Lock className="size-3" /> {t.match.tipLocked}
          </p>
        ) : null
      ) : locked ? (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="size-3" /> {t.match.tipLocked}
        </p>
      ) : justSaved ? (
        <p className="flex animate-pop-in items-center gap-1 text-xs font-medium text-primary">
          <Check className="size-3" /> {t.match.tipSaved}
        </p>
      ) : state.error ? (
        <p className="text-xs text-red-300">{state.error}</p>
      ) : current ? (
        <p className="text-xs text-muted-foreground">{t.match.tipHint}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{t.match.tipPlace(homeShort, awayShort)}</p>
      )}
    </form>
  );
}
