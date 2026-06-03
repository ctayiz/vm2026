"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { RefreshCw, Calculator, Save, Ban, Trash2, CheckCircle2, Crown, Goal } from "lucide-react";
import {
  syncScheduleAction,
  recomputeAllAction,
  setResultAction,
  setTeamProgressAction,
  syncStatsAction,
  toggleBlockUserAction,
  deleteUserAction,
  type AdminState,
} from "@/server/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { flagEmoji } from "@/lib/flags";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n-provider";

export function TeamProgressRow({
  teamId,
  name,
  flagCode,
  group,
  reachedPhase,
  isChampion,
}: {
  teamId: string;
  name: string;
  flagCode: string | null;
  group: string | null;
  reachedPhase: string | null;
  isChampion: boolean;
}) {
  const t = useT();
  const REACH_OPTIONS = [
    { value: "", label: t.admin.reach.open },
    { value: "GROUP", label: t.admin.reach.group },
    { value: "R32", label: t.admin.reach.r32 },
    { value: "R16", label: t.admin.reach.r16 },
    { value: "QF", label: t.admin.reach.qf },
    { value: "SF", label: t.admin.reach.sf },
    { value: "FINAL", label: t.admin.reach.final },
  ];
  const [pending, start] = useTransition();
  const [phase, setPhase] = useState(reachedPhase ?? "");

  const save = (nextPhase: string, champion: boolean) => {
    const fd = new FormData();
    fd.set("teamId", teamId);
    fd.set("reachedPhase", nextPhase);
    fd.set("isChampion", champion ? "true" : "false");
    start(async () => {
      await setTeamProgressAction({ ok: false }, fd);
    });
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      <span className="text-xl">{flagEmoji(flagCode)}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {name}
        {group && <span className="ml-1 text-xs text-muted-foreground">· Gr. {group}</span>}
      </span>
      <select
        value={phase}
        disabled={pending || isChampion}
        onChange={(e) => {
          setPhase(e.target.value);
          save(e.target.value, isChampion);
        }}
        className="h-9 rounded-md border border-input bg-background/60 px-2 text-xs disabled:opacity-60"
      >
        {REACH_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={() => save(isChampion ? phase : "FINAL", !isChampion)}
        aria-label={t.admin.champion}
        className={cn(
          "flex size-9 items-center justify-center rounded-md border transition-colors",
          isChampion
            ? "border-amber-400/60 bg-amber-400/20 text-amber-300"
            : "border-border text-muted-foreground hover:bg-secondary",
        )}
      >
        <Crown className="size-4" />
      </button>
    </div>
  );
}

export function SyncButton() {
  const t = useT();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      <Button
        onClick={() => start(async () => setMsg((await syncScheduleAction()).message ?? null))}
        disabled={pending}
      >
        <RefreshCw className={pending ? "animate-spin" : ""} /> {t.admin.syncSchedule}
      </Button>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}

export function SyncStatsButton() {
  const t = useT();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="secondary"
        onClick={() =>
          start(async () => {
            const r = await syncStatsAction();
            setMsg(r.message ?? r.error ?? null);
          })
        }
        disabled={pending}
      >
        <Goal className={pending ? "animate-spin" : ""} /> {t.admin.syncStats}
      </Button>
      {msg && <p className="max-w-xs text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}

export function RecomputeButton() {
  const t = useT();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="secondary"
        onClick={() => start(async () => setMsg((await recomputeAllAction()).message ?? null))}
        disabled={pending}
      >
        <Calculator /> {t.admin.recompute}
      </Button>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}

function ResultSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="icon" variant="secondary" disabled={pending} aria-label="Ergebnis speichern">
      <Save className="size-4" />
    </Button>
  );
}

export function ResultForm({
  matchId,
  homeGoals,
  awayGoals,
}: {
  matchId: string;
  homeGoals: number | null;
  awayGoals: number | null;
}) {
  const [state, formAction] = useFormState<AdminState, FormData>(setResultAction, { ok: false });
  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="matchId" value={matchId} />
      <input type="hidden" name="status" value="finished" />
      <Input
        type="number"
        name="homeGoals"
        min={0}
        defaultValue={homeGoals ?? ""}
        className="w-14 text-center"
        required
        aria-label="Tore Heim"
      />
      <span className="text-muted-foreground">:</span>
      <Input
        type="number"
        name="awayGoals"
        min={0}
        defaultValue={awayGoals ?? ""}
        className="w-14 text-center"
        required
        aria-label="Tore Auswärts"
      />
      <ResultSubmit />
      {state.ok && <CheckCircle2 className="size-4 text-primary" />}
      {state.error && <span className="text-xs text-red-300">{state.error}</span>}
    </form>
  );
}

export function UserRowActions({
  userId,
  blocked,
  displayName,
}: {
  userId: string;
  blocked: boolean;
  displayName: string;
}) {
  const t = useT();
  const [pending, start] = useTransition();

  const block = () => {
    const fd = new FormData();
    fd.set("userId", userId);
    start(async () => {
      await toggleBlockUserAction({ ok: false }, fd);
    });
  };

  const del = () => {
    if (!confirm(t.admin.confirmDelete(displayName))) return;
    const fd = new FormData();
    fd.set("userId", userId);
    start(async () => {
      await deleteUserAction({ ok: false }, fd);
    });
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" onClick={block} disabled={pending}>
        <Ban className="size-4" /> {blocked ? t.admin.unblock : t.admin.block}
      </Button>
      <Button variant="ghost" size="icon" onClick={del} disabled={pending} aria-label="Löschen">
        <Trash2 className="size-4 text-red-300" />
      </Button>
    </div>
  );
}
