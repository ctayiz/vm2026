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

function OptionButton({
  value,
  label,
  sublabel,
  selected,
  locked,
  compact,
  flash,
  onOverrideClick,
}: {
  value: Prediction;
  label: string;
  sublabel?: string;
  selected: boolean;
  locked: boolean;
  compact?: boolean;
  flash?: boolean;
  onOverrideClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type={onOverrideClick ? "button" : "submit"}
      name={onOverrideClick ? undefined : "prediction"}
      value={onOverrideClick ? undefined : value}
      onClick={(e) => {
        if (locked) return;
        if (onOverrideClick) {
          onOverrideClick(e);
        } else {
          tapHaptic();
        }
      }}
      disabled={locked || pending}
      aria-pressed={selected}
      className={cn(
        "flex-1 rounded-lg border font-bold transition-all active:scale-95",
        compact ? "py-1 text-xs" : "py-2.5 text-sm",
        "disabled:cursor-not-allowed",
        sublabel ? "flex flex-col items-center leading-none" : "",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
          : "border-border bg-secondary/40 text-foreground hover:border-primary/60 hover:bg-secondary",
        locked && !selected && "opacity-40",
        flash && "animate-tick-pop",
      )}
    >
      {label}
      {sublabel && (
        <span className={cn("font-normal opacity-60", compact ? "text-[8px]" : "text-[9px]")}>
          {sublabel}
        </span>
      )}
    </button>
  );
}

function ETWinnerButton({
  value,
  label,
  selected,
  compact,
}: {
  value: string;
  label: string;
  selected: boolean;
  compact?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="knockoutWinner"
      value={value}
      onClick={() => tapHaptic()}
      disabled={pending}
      aria-pressed={selected}
      className={cn(
        "flex-1 rounded-lg border font-bold transition-all active:scale-95",
        compact ? "py-1 text-xs" : "py-2.5 text-sm",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
          : "border-border bg-secondary/40 text-foreground hover:border-primary/60 hover:bg-secondary",
      )}
    >
      {label}
    </button>
  );
}

export function PredictionPicker({
  matchId,
  initialPrediction,
  initialKnockoutWinner = null,
  locked,
  homeShort,
  awayShort,
  compact = false,
  isKnockout = false,
}: {
  matchId: string;
  initialPrediction: Prediction | null;
  initialKnockoutWinner?: string | null;
  locked: boolean;
  homeShort: string;
  awayShort: string;
  compact?: boolean;
  isKnockout?: boolean;
}) {
  const t = useT();
  const [state, formAction] = useFormState<PredictionState, FormData>(submitPredictionAction, {
    ok: false,
  });
  const [justSaved, setJustSaved] = useState(false);
  const [showETPicker, setShowETPicker] = useState(false);

  const current = state.prediction ?? initialPrediction;
  // Nach erfolgreichem Speichern den neuen V/E-Sieger aus dem State übernehmen
  const currentKW = state.ok ? (state.knockoutWinner ?? null) : initialKnockoutWinner;

  useEffect(() => {
    if (state.ok) {
      setJustSaved(true);
      setShowETPicker(false);
      burstConfetti();
      successHaptic();
      const timer = setTimeout(() => setJustSaved(false), 1600);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // KO + X angeklickt → V/E-Sieger-Picker zeigen statt sofort einreichen
  const handleDrawClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    tapHaptic();
    setShowETPicker(true);
  };

  // Sub-Picker: V/E-Sieger wählen
  if (showETPicker && !locked) {
    return (
      <form action={formAction} className={compact ? "space-y-1" : "space-y-2"}>
        <input type="hidden" name="matchId" value={matchId} />
        <input type="hidden" name="prediction" value="DRAW" />
        <p className={compact ? "text-[10px] text-muted-foreground" : "text-xs text-muted-foreground"}>
          Unentschieden n.90 Min. – wer gewinnt V/E?
        </p>
        <div className={cn("flex items-center", compact ? "gap-1" : "gap-2")}>
          <ETWinnerButton value="HOME" label={homeShort} selected={currentKW === "HOME"} compact={compact} />
          <button
            type="button"
            onClick={() => setShowETPicker(false)}
            className={cn(
              "shrink-0 rounded-lg border border-border bg-secondary/40 font-bold text-muted-foreground transition-all hover:border-border/80 hover:bg-secondary active:scale-95",
              compact ? "px-2 py-1 text-xs" : "px-3 py-2.5 text-sm",
            )}
          >
            ✕
          </button>
          <ETWinnerButton value="AWAY" label={awayShort} selected={currentKW === "AWAY"} compact={compact} />
        </div>
        {state.error && (
          <p className={compact ? "text-[10px] text-red-300" : "text-xs text-red-300"}>{state.error}</p>
        )}
      </form>
    );
  }

  return (
    <form action={formAction} className={compact ? "space-y-1" : "space-y-2"}>
      <input type="hidden" name="matchId" value={matchId} />
      <div className={cn("flex items-center", compact ? "gap-1" : "gap-2")}>
        <OptionButton
          value="HOME_WIN"
          label={homeShort}
          selected={current === "HOME_WIN"}
          locked={locked}
          compact={compact}
          flash={justSaved && current === "HOME_WIN"}
        />
        <OptionButton
          value="DRAW"
          label="X"
          sublabel={isKnockout ? "bis 90min" : undefined}
          selected={current === "DRAW"}
          locked={locked}
          compact={compact}
          flash={justSaved && current === "DRAW"}
          onOverrideClick={isKnockout && !locked ? handleDrawClick : undefined}
        />
        <OptionButton
          value="AWAY_WIN"
          label={awayShort}
          selected={current === "AWAY_WIN"}
          locked={locked}
          compact={compact}
          flash={justSaved && current === "AWAY_WIN"}
        />
      </div>

      {/* V/E-Sieger anzeigen wenn DRAW für K.-o.-Spiel gespeichert */}
      {current === "DRAW" && isKnockout && currentKW && !justSaved && (
        <p className={compact ? "text-[10px] text-muted-foreground" : "text-xs text-muted-foreground"}>
          V/E:{" "}
          <button
            type="button"
            onClick={() => !locked && setShowETPicker(true)}
            className={cn(
              "font-semibold text-foreground",
              !locked && "underline-offset-2 hover:underline",
            )}
          >
            {currentKW === "HOME" ? homeShort : awayShort}
          </button>
        </p>
      )}

      {compact ? (
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
