"use client";

import { Trophy, Zap, Sparkles } from "lucide-react";
import { Flag } from "@/components/flag";
import { useT } from "@/components/i18n-provider";
import { MAX_JOKERS, type Phase, type Prediction } from "@/lib/constants";
import type { UserRecap, RecapMatch, RecapBonus } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** Punkte-Pille (grün bei Punkten, rot bei 0). */
function Pts({ points }: { points: number | null }) {
  const ok = (points ?? 0) > 0;
  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-2 py-1 text-center text-xs font-bold tabular-nums",
        ok ? "bg-primary/15 text-primary" : "bg-destructive/15 text-red-300",
      )}
      style={{ minWidth: "2.5rem" }}
    >
      {points == null ? "—" : ok ? `+${points}` : "0"}
    </span>
  );
}

function MatchRow({ m }: { m: RecapMatch }) {
  const t = useT();
  const PRED_LABEL: Record<Prediction, string> = {
    HOME_WIN: t.outcome.home,
    DRAW: t.outcome.draw,
    AWAY_WIN: t.outcome.away,
  };
  const isPen = m.apiStatus === "PEN" && m.homePenalties != null && m.awayPenalties != null;
  const decider = isPen
    ? `${t.bracket.afterPenalties} ${m.homePenalties}:${m.awayPenalties}`
    : m.apiStatus === "AET"
      ? t.bracket.afterExtraTime
      : null;
  // Bei DRAW-Tipp im K.-o. den getippten V/E-Sieger als Kürzel anhängen.
  const koCode = m.knockoutWinner === "HOME" ? m.homeCode : m.knockoutWinner === "AWAY" ? m.awayCode : null;
  const tipText =
    m.prediction === "DRAW" && koCode ? `${PRED_LABEL.DRAW} (+${koCode})` : PRED_LABEL[m.prediction];

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        <Flag code={m.homeFlag} className="text-base" />
        <span className="truncate font-medium">{m.homeCode ?? m.homeName}</span>
        <span className="mx-0.5 shrink-0 font-bold tabular-nums">
          {m.homeGoals}:{m.awayGoals}
        </span>
        <span className="truncate font-medium">{m.awayCode ?? m.awayName}</span>
        <Flag code={m.awayFlag} className="text-base" />
        {decider && <span className="shrink-0 text-[10px] text-muted-foreground">{decider}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="whitespace-nowrap text-right text-[11px] text-muted-foreground">
          {t.recap.tip} <span className="font-medium text-foreground">{tipText}</span>
        </span>
        {m.joker && <Zap className="size-3 shrink-0 fill-amber-300 text-amber-300" />}
      </div>
      <Pts points={m.points} />
    </div>
  );
}

function BonusRow({ b }: { b: RecapBonus }) {
  const t = useT();
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2">
      <span className="min-w-0 flex-1 truncate text-[11px] uppercase tracking-wide text-muted-foreground">
        {t.recap.bonusShort[b.key] ?? b.key}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-sm">
        {b.flagCode && <Flag code={b.flagCode} className="text-base" />}
        <span className="max-w-[9rem] truncate font-medium">{b.pickLabel}</span>
      </span>
      <Pts points={b.points} />
    </div>
  );
}

function Metric({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-secondary/50 px-2 py-2 text-center">
      <div className={cn("text-lg font-bold tabular-nums", accent && "text-amber-300")}>{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

/**
 * Persönliche Turnier-History – geteilt zwischen dem Danke-Modal und der
 * eigenständigen Seite /rueckblick. Reine Anzeige (Daten kommen als Prop).
 */
export function HistoryView({ data }: { data: UserRecap }) {
  const t = useT();
  const accuracy = data.scoredCount > 0 ? Math.round((data.correctCount / data.scoredCount) * 100) : 0;
  const isEmpty = data.phases.length === 0 && data.bonus.length === 0;

  return (
    <div className="space-y-4">
      {/* Kennzahlen */}
      <div className="grid grid-cols-4 gap-1.5">
        <Metric value={String(data.totalPoints)} label={t.recap.metricTotal} accent />
        <Metric value={String(data.matchPoints)} label={t.recap.metricMatch} />
        <Metric value={String(data.bonusPoints)} label={t.recap.metricBonus} />
        <Metric value={`${data.jokersUsed}/${MAX_JOKERS}`} label={t.recap.metricJokers} />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Metric value={`${accuracy}%`} label={t.recap.metricAccuracy} />
        <Metric value={`${data.correctCount} / ${data.scoredCount}`} label={t.recap.metricCorrect} />
      </div>

      {isEmpty && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t.recap.empty}
        </p>
      )}

      {/* Spiele nach Phase */}
      {data.phases.map((section) => (
        <section key={section.phase} className="space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Trophy className="size-3 text-amber-300" />
            {t.phase[section.phase as Phase]?.label ?? section.phase}
          </h3>
          {section.matches.map((m) => (
            <MatchRow key={m.id} m={m} />
          ))}
        </section>
      ))}

      {/* Bonus-Tipps */}
      {data.bonus.length > 0 && (
        <section className="space-y-1.5">
          <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="size-3 text-amber-300" />
            {t.recap.bonusSection}
          </h3>
          {data.bonus.map((b) => (
            <BonusRow key={b.key} b={b} />
          ))}
        </section>
      )}
    </div>
  );
}
