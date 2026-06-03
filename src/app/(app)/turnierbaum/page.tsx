import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Flag } from "@/components/flag";
import { formatDate } from "@/lib/format";
import { outcomeFromGoals } from "@/lib/scoring";
import { PHASE_META, type Phase } from "@/lib/constants";
import { Network } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Spalten-Reihenfolge des Baums (Spiel um Platz 3 wird separat dargestellt)
const COLUMNS: Phase[] = ["R32", "R16", "QF", "SF", "FINAL"];

type BracketMatch = {
  id: string;
  phase: string;
  kickoff: Date;
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
  homeTeam: { name: string; code: string; flagCode: string | null } | null;
  awayTeam: { name: string; code: string; flagCode: string | null } | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
};

function Side({
  team,
  placeholder,
  goals,
  winner,
}: {
  team: BracketMatch["homeTeam"];
  placeholder: string | null;
  goals: number | null;
  winner: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2 px-2 py-1.5", winner && "font-semibold text-foreground")}>
      <Flag code={team?.flagCode} className="text-base" />
      <span className={cn("flex-1 truncate text-xs", !team && "italic text-muted-foreground")}>
        {team?.name ?? placeholder ?? "offen"}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">{goals ?? "–"}</span>
    </div>
  );
}

function MatchBox({ m }: { m: BracketMatch }) {
  const finished = m.status === "finished" && m.homeGoals != null && m.awayGoals != null;
  const outcome = finished ? outcomeFromGoals(m.homeGoals!, m.awayGoals!) : null;
  return (
    <div className="w-48 shrink-0 overflow-hidden rounded-lg border border-border bg-card">
      <Side
        team={m.homeTeam}
        placeholder={m.homePlaceholder}
        goals={m.homeGoals}
        winner={outcome === "HOME_WIN"}
      />
      <div className="border-t border-border/50" />
      <Side
        team={m.awayTeam}
        placeholder={m.awayPlaceholder}
        goals={m.awayGoals}
        winner={outcome === "AWAY_WIN"}
      />
      <div className="border-t border-border/50 px-2 py-1 text-[10px] text-muted-foreground">
        {finished ? "beendet" : formatDate(m.kickoff)}
      </div>
    </div>
  );
}

export default async function TurnierbaumPage() {
  await requireUser();
  const matches = (await db.match.findMany({
    where: { phase: { in: ["R32", "R16", "QF", "SF", "TP", "FINAL"] } },
    orderBy: { kickoff: "asc" },
    include: { homeTeam: true, awayTeam: true },
  })) as unknown as BracketMatch[];

  const byPhase = (p: Phase) => matches.filter((m) => m.phase === p);
  const thirdPlace = byPhase("TP" as Phase);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Network className="size-5 text-primary" />
        <h1 className="text-2xl font-bold">Turnierbaum</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Der Weg ins Finale – Runde der letzten 32 bis zum Titel. Horizontal scrollbar.
      </p>

      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max gap-4">
          {COLUMNS.map((phase) => {
            const col = byPhase(phase);
            if (col.length === 0) return null;
            return (
              <div key={phase} className="flex flex-col gap-3">
                <div className="sticky top-0 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {PHASE_META[phase].label}
                  <span className="ml-1 text-muted-foreground/60">({col.length})</span>
                </div>
                <div className="flex flex-1 flex-col justify-around gap-3">
                  {col.map((m) => (
                    <MatchBox key={m.id} m={m} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {thirdPlace.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {PHASE_META["TP"].label}
          </h2>
          {thirdPlace.map((m) => (
            <MatchBox key={m.id} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}
