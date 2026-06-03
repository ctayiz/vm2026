import { requireUser } from "@/lib/auth";
import { getTournamentData } from "@/lib/queries";
import {
  TournamentBetCard,
  type TeamOption,
  type PlayerOption,
} from "@/components/tournament-bet-card";
import { Lock, Sparkles } from "lucide-react";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TurnierTippsPage() {
  const user = await requireUser();
  const { questions, teams, players, lock } = await getTournamentData(user.id);

  const teamOptions: TeamOption[] = teams.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    flagCode: t.flagCode,
    group: t.group,
  }));

  const playerOptions: PlayerOption[] = players.map((p) => ({
    id: p.id,
    name: p.name,
    teamName: p.team?.name ?? null,
    goals: p.goals,
  }));

  const maxPoints = questions.reduce((s, q) => s + q.points, 0);

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-amber-400/10 via-card to-card p-5 sm:p-6">
        <div className="blob right-[-15%] top-[-50%] h-48 w-48 animate-blob bg-amber-400/25" />
        <div className="relative space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
            <Sparkles className="size-4" /> Bonuspunkte
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Turnier-<span className="text-gradient">Tipps</span>
          </h1>
          <p className="max-w-lg text-sm text-muted-foreground">
            Tippe das große Bild: Wer kommt wie weit, wer wird Weltmeister? Bis zu{" "}
            <span className="font-semibold text-foreground">{maxPoints} Bonuspunkte</span> fürs ganze
            Turnier – zusätzlich zu den Spiel-Tipps.
          </p>
        </div>
      </div>

      {/* Lock-Hinweis */}
      <div
        className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
          lock.locked
            ? "border-border bg-secondary/40 text-muted-foreground"
            : "border-primary/30 bg-primary/10 text-foreground"
        }`}
      >
        <Lock className="size-4 shrink-0" />
        {lock.locked ? (
          <span>Turnier-Tipps sind gesperrt – das Turnier hat begonnen.</span>
        ) : (
          <span>
            Tipps änderbar bis zum Anpfiff
            {lock.lockTime ? <> am {formatDateTime(lock.lockTime)}</> : null}.
          </span>
        )}
      </div>

      {/* Fragen */}
      <div className="grid gap-3 sm:grid-cols-2">
        {questions.map((q, i) => (
          <TournamentBetCard
            key={q.key}
            index={i}
            teams={teamOptions}
            players={playerOptions}
            question={{
              key: q.key,
              label: q.label,
              hint: q.hint,
              points: q.points,
              pick: q.pick,
              pickedTeamId: q.pickedTeam?.id ?? null,
              pickedPlayerId: q.pickedPlayer?.id ?? null,
              pickedLabel: q.pickedPlayer
                ? q.pickedPlayer.name
                : q.pickedTeam
                  ? q.pickedTeam.name
                  : null,
              pickedFlag: q.pickedPlayer
                ? (q.pickedPlayer.team?.flagCode ?? null)
                : (q.pickedTeam?.flagCode ?? null),
              status: q.status,
              earnedPoints: q.points,
              locked: lock.locked,
            }}
          />
        ))}
      </div>

      {teamOptions.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Noch keine Teams vorhanden – bitte als Admin den Spielplan synchronisieren.
        </p>
      )}
    </div>
  );
}
