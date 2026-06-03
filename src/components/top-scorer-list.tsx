import { Crown } from "lucide-react";
import { Flag } from "@/components/flag";
import { cn } from "@/lib/utils";

export interface ScorerRow {
  id: string;
  name: string;
  goals: number;
  assists: number;
  isTopScorer: boolean;
  team: { name: string; flagCode: string | null } | null;
}

export function TopScorerList({ scorers }: { scorers: ScorerRow[] }) {
  if (scorers.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Noch keine Torschützen. Sobald Live-Daten geladen sind (Admin → Live-Daten), erscheint hier
        die Torschützenliste.
      </p>
    );
  }
  return (
    <div className="space-y-1.5">
      {scorers.map((s, i) => (
        <div
          key={s.id}
          className={cn(
            "card-hover animate-fade-up glass flex items-center gap-3 rounded-xl px-4 py-2.5",
            s.isTopScorer && "border-amber-400/50",
          )}
          style={{ animationDelay: `${Math.min(i, 15) * 40}ms` }}
        >
          <div className="flex w-6 justify-center">
            {s.isTopScorer ? (
              <Crown className="size-5 text-amber-300" />
            ) : (
              <span className="text-sm font-bold tabular-nums text-muted-foreground">{i + 1}</span>
            )}
          </div>
          <Flag code={s.team?.flagCode} className="text-xl" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{s.name}</div>
            <div className="truncate text-xs text-muted-foreground">{s.team?.name ?? "—"}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold tabular-nums text-primary">{s.goals}</div>
            <div className="text-[10px] uppercase text-muted-foreground">
              Tore{s.assists > 0 ? ` · ${s.assists} Vorl.` : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
