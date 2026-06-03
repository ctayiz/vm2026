import { Flag } from "@/components/flag";
import { cn } from "@/lib/utils";
import type { TeamStatsRow } from "@/lib/team-stats";

function FormDots({ form }: { form: ("W" | "D" | "L")[] }) {
  const color = { W: "bg-primary", D: "bg-muted-foreground/50", L: "bg-destructive/70" };
  return (
    <div className="flex items-center justify-end gap-1">
      {form.length === 0 ? (
        <span className="text-xs text-muted-foreground">—</span>
      ) : (
        form.map((f, i) => <span key={i} className={cn("size-2.5 rounded-full", color[f])} title={f} />)
      )}
    </div>
  );
}

export function TeamTable({ rows }: { rows: TeamStatsRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Noch keine abgeschlossenen Spiele – sobald Ergebnisse eingetragen sind, entsteht hier die
        Team-Tabelle.
      </p>
    );
  }
  return (
    <div className="glass overflow-hidden rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">#</th>
            <th className="px-2 py-2 text-left font-medium">Team</th>
            <th className="px-1 py-2 text-center font-medium">Sp</th>
            <th className="hidden px-1 py-2 text-center font-medium sm:table-cell">S</th>
            <th className="hidden px-1 py-2 text-center font-medium sm:table-cell">U</th>
            <th className="hidden px-1 py-2 text-center font-medium sm:table-cell">N</th>
            <th className="px-2 py-2 text-center font-medium">Tore</th>
            <th className="px-1 py-2 text-center font-medium">Diff</th>
            <th className="px-2 py-2 text-center font-medium">Pkt</th>
            <th className="hidden px-3 py-2 text-right font-medium md:table-cell">Form</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className="border-b border-border/40 last:border-0">
              <td className="px-3 py-2 text-muted-foreground tabular-nums">{i + 1}</td>
              <td className="px-2 py-2">
                <span className="flex items-center gap-2">
                  <Flag code={r.flagCode} />
                  <span className="truncate font-medium">{r.name}</span>
                  {r.group && <span className="text-[10px] text-muted-foreground">{r.group}</span>}
                </span>
              </td>
              <td className="px-1 py-2 text-center tabular-nums">{r.played}</td>
              <td className="hidden px-1 py-2 text-center tabular-nums sm:table-cell">{r.won}</td>
              <td className="hidden px-1 py-2 text-center tabular-nums sm:table-cell">{r.drawn}</td>
              <td className="hidden px-1 py-2 text-center tabular-nums sm:table-cell">{r.lost}</td>
              <td className="px-2 py-2 text-center tabular-nums">
                {r.goalsFor}:{r.goalsAgainst}
              </td>
              <td className="px-1 py-2 text-center tabular-nums">
                {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
              </td>
              <td className="px-2 py-2 text-center font-bold tabular-nums text-primary">{r.points}</td>
              <td className="hidden px-3 py-2 md:table-cell">
                <FormDots form={r.form} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
