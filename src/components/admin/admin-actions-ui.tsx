"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Calculator, Save, Ban, Trash2, CheckCircle2, Crown, Goal, KeyRound, Copy, RefreshCw } from "lucide-react";
import {
  recomputeAllAction,
  setResultAction,
  setTeamProgressAction,
  syncStatsAction,
  syncLiveScoresAction,
  toggleBlockUserAction,
  deleteUserAction,
  createPasswordResetAction,
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

export function LiveScoresButton() {
  const t = useT();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      <Button
        onClick={() =>
          start(async () => {
            const r = await syncLiveScoresAction();
            setMsg(r.message ?? r.error ?? null);
          })
        }
        disabled={pending}
      >
        <RefreshCw className={pending ? "animate-spin" : ""} /> {t.admin.syncLive}
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
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [resetErr, setResetErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const makeResetLink = () => {
    setResetErr(null);
    setCopied(false);
    const fd = new FormData();
    fd.set("userId", userId);
    start(async () => {
      const r = await createPasswordResetAction(fd);
      if (r.ok && r.url) setResetUrl(r.url);
      else setResetErr(r.error ?? t.admin.resetFailed);
    });
  };

  const copy = async () => {
    if (!resetUrl) return;
    try {
      await navigator.clipboard.writeText(resetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard nicht verfügbar – Link kann manuell markiert werden */
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={makeResetLink} disabled={pending}>
          <KeyRound className="size-4" /> {t.admin.resetPw}
        </Button>
        <Button variant="ghost" size="sm" onClick={block} disabled={pending}>
          <Ban className="size-4" /> {blocked ? t.admin.unblock : t.admin.block}
        </Button>
        <Button variant="ghost" size="icon" onClick={del} disabled={pending} aria-label="Löschen">
          <Trash2 className="size-4 text-red-300" />
        </Button>
      </div>

      {resetErr && <p className="text-xs text-red-300">{resetErr}</p>}

      {resetUrl && (
        <div className="w-full max-w-md space-y-1.5 rounded-lg border border-border bg-secondary/30 p-2.5 text-left">
          <p className="text-[11px] text-muted-foreground">{t.admin.resetLinkTitle}</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={resetUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-input bg-background/60 px-2 py-1.5 text-xs"
            />
            <Button type="button" size="sm" variant="secondary" onClick={copy}>
              <Copy className="size-3.5" /> {copied ? t.admin.resetCopied : t.admin.resetCopy}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">{t.admin.resetExpiry}</p>
        </div>
      )}
    </div>
  );
}
