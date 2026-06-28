import { Fragment } from "react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Flag } from "@/components/flag";
import { formatDate } from "@/lib/format";
import { getLocale, getDictionary } from "@/lib/i18n-server";
import { outcomeOf } from "@/lib/scoring";
import { PHASE_META, type Phase } from "@/lib/constants";
import { ChevronRight, Crown, Trophy } from "lucide-react";
import { BracketIcon } from "@/components/bracket-icon";
import { localizePlaceholder } from "@/lib/team-map";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const COLUMNS: Phase[] = ["R32", "R16", "QF", "SF", "FINAL"];

type BracketMatch = {
  id: string;
  phase: string;
  kickoff: Date;
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
  winner: string | null;
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
  champion,
}: {
  team: BracketMatch["homeTeam"];
  placeholder: string | null;
  goals: number | null;
  winner: boolean;
  champion?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-1.5 px-2 py-1.5", winner && "font-semibold text-foreground")}>
      <Flag code={team?.flagCode} className="text-sm" />
      <span className={cn("flex-1 truncate text-xs", !team && "italic text-muted-foreground")}>
        {team?.name ?? placeholder ?? "—"}
      </span>
      {champion && winner && <Crown className="size-3 text-amber-300" />}
      <span className="text-[11px] tabular-nums text-muted-foreground">{goals ?? "–"}</span>
    </div>
  );
}

function MatchBox({ m, featured }: { m: BracketMatch; featured?: boolean }) {
  const t = getDictionary();
  const locale = getLocale();
  const finished = m.status === "finished" && m.homeGoals != null && m.awayGoals != null;
  const outcome = finished ? outcomeOf(m.homeGoals!, m.awayGoals!, m.winner as "HOME" | "AWAY" | null) : null;
  return (
    <div
      className={cn(
        "card-hover relative w-full overflow-hidden rounded-lg border",
        featured
          ? "border-amber-400/50 bg-gradient-to-br from-amber-400/10 via-card to-card shadow-lg shadow-amber-500/10"
          : "glass border-border",
      )}
    >
      {featured && <span className="shimmer-gold pointer-events-none absolute inset-0 opacity-60" />}
      <div className="relative">
        <Side team={m.homeTeam} placeholder={localizePlaceholder(m.homePlaceholder, t.placeholder)} goals={m.homeGoals} winner={outcome === "HOME_WIN"} champion={featured} />
        <div className="border-t border-border/50" />
        <Side team={m.awayTeam} placeholder={localizePlaceholder(m.awayPlaceholder, t.placeholder)} goals={m.awayGoals} winner={outcome === "AWAY_WIN"} champion={featured} />
        <div className="border-t border-border/40 px-2 py-0.5 text-[9px] text-muted-foreground">
          {finished ? t.bracket.finished : formatDate(m.kickoff, locale)}
        </div>
      </div>
    </div>
  );
}

function RoundHeader({ phase, count }: { phase: Phase; count: number }) {
  const t = getDictionary();
  const isFinal = phase === "FINAL";
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-wide",
        isFinal ? "bg-amber-400/15 text-amber-300" : "text-muted-foreground",
      )}
    >
      {isFinal && <Trophy className="size-3" />}
      {t.phase[phase].label}
      <span className="text-muted-foreground/60">({count})</span>
    </div>
  );
}

/**
 * Verbindungsspalte (Desktop): pro Spiel der NÄCHSTEN Runde ein „}"-Elbow mit
 * Pfeilspitze – verbindet die zwei Sieger der Vorrunde mit dem Folgespiel.
 */
function Connectors({ nextCount, gold }: { nextCount: number; gold?: boolean }) {
  const color = gold ? "text-amber-300/70" : "text-muted-foreground/40";
  return (
    <div className="flex w-5 shrink-0 flex-col justify-around sm:w-6">
      {Array.from({ length: nextCount }).map((_, i) => (
        <div key={i} className={cn("relative flex flex-1 items-center justify-end", color)}>
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 24 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M0 25 H12 V75 H0 M12 50 H21"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <ChevronRight className="relative size-3" />
        </div>
      ))}
    </div>
  );
}

/**
 * Baut die korrekte Bracket-Reihenfolge per DFS aus den W<n>-Platzhaltern.
 *
 * Die WM 2026 hat: Gruppenphase 72 Spiele → R32 beginnt bei Match-Nr. 73.
 * Jede Phase nummeriert ihre Matches fortlaufend in Anpfiff-Reihenfolge.
 * Die Platzhalter "W89", "W90" in einem QF-Match verweisen auf die R16-Matches
 * mit diesen Nummern. Diese Referenz liefert die echte Paarungsstruktur.
 */
function buildBracketCols(matches: BracketMatch[]): { phase: Phase; matches: BracketMatch[] }[] {
  const PHASE_START: Partial<Record<string, number>> = {
    R32: 73, R16: 89, QF: 97, SF: 101,
  };
  const sortedByKickoff = (p: string) =>
    matches.filter((m) => m.phase === p).sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff));

  // Map: competition match number → BracketMatch
  const numToMatch = new Map<number, BracketMatch>();
  for (const [phase, start] of Object.entries(PHASE_START) as [string, number][]) {
    sortedByKickoff(phase).forEach((m, i) => numToMatch.set(start + i, m));
  }

  const parseW = (s: string | null): number | null => {
    if (!s) return null;
    const m = s.match(/^W(\d+)$/);
    return m ? Number(m[1]) : null;
  };

  const prevPhaseOf: Partial<Record<string, Phase>> = {
    FINAL: "SF", SF: "QF", QF: "R16", R16: "R32",
  };

  const ordered: Partial<Record<Phase, BracketMatch[]>> = {
    R32: [], R16: [], QF: [], SF: [],
  };
  const seen = new Set<string>();

  // DFS: visit a match, then recursively visit its two source matches
  const visit = (m: BracketMatch): void => {
    const pp = prevPhaseOf[m.phase];
    if (!pp || !ordered[pp]) return;
    for (const ph of [m.homePlaceholder, m.awayPlaceholder]) {
      const num = parseW(ph);
      if (num == null) continue;
      const src = numToMatch.get(num);
      if (!src || seen.has(src.id)) continue;
      seen.add(src.id);
      ordered[pp]!.push(src);
      visit(src);
    }
  };

  // Start DFS from each FINAL match (normalerweise genau eines)
  for (const m of sortedByKickoff("FINAL")) {
    visit(m);
  }

  return COLUMNS.map((phase) => ({
    phase,
    matches:
      phase === "FINAL"
        ? sortedByKickoff("FINAL")
        : ordered[phase]?.length
          ? ordered[phase]!
          : sortedByKickoff(phase), // Fallback falls DFS fehlschlägt
  })).filter((c) => c.matches.length > 0);
}

export default async function TurnierbaumPage() {
  await requireUser();
  const t = getDictionary();
  const matches = (await db.match.findMany({
    where: { phase: { in: ["R32", "R16", "QF", "SF", "TP", "FINAL"] } },
    orderBy: { kickoff: "asc" },
    include: { homeTeam: true, awayTeam: true },
  })) as unknown as BracketMatch[];

  const cols = buildBracketCols(matches);
  const thirdPlace = matches.filter((m) => m.phase === "TP");

  return (
    <div className="space-y-5">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
        <div className="blob right-[-15%] top-[-60%] h-40 w-40 animate-blob bg-primary/25" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15">
            <BracketIcon className="size-5 text-primary" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">{t.bracket.title}</h1>
            <p className="text-sm text-muted-foreground">{t.bracket.subtitle}</p>
          </div>
        </div>
      </div>

      {/* DESKTOP: echter Baum mit Verbindungspfeilen – passt in die Breite */}
      <div className="hidden md:flex md:items-stretch">
        {cols.map((c, i) => (
          <Fragment key={c.phase}>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <RoundHeader phase={c.phase} count={c.matches.length} />
              <div className="flex flex-1 flex-col justify-around gap-2">
                {c.matches.map((m) => (
                  <MatchBox key={m.id} m={m} featured={c.phase === "FINAL"} />
                ))}
              </div>
            </div>
            {i < cols.length - 1 && (
              <Connectors nextCount={cols[i + 1].matches.length} gold={cols[i + 1].phase === "FINAL"} />
            )}
          </Fragment>
        ))}
      </div>

      {/* MOBIL: Runden untereinander (kein Querscrollen) */}
      <div className="space-y-4 md:hidden">
        {cols.map((c) => (
          <section key={c.phase} className="space-y-2">
            <RoundHeader phase={c.phase} count={c.matches.length} />
            <div className="space-y-2">
              {c.matches.map((m) => (
                <MatchBox key={m.id} m={m} featured={c.phase === "FINAL"} />
              ))}
            </div>
          </section>
        ))}
        {thirdPlace.length > 0 && (
          <section className="space-y-2">
            <RoundHeader phase={"TP" as Phase} count={thirdPlace.length} />
            <div className="space-y-2">
              {thirdPlace.map((m) => (
                <MatchBox key={m.id} m={m} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Spiel um Platz 3 (Desktop) */}
      {thirdPlace.length > 0 && (
        <div className="hidden space-y-2 md:block">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t.phase.TP.label}
          </h2>
          <div className="max-w-xs">
            {thirdPlace.map((m) => (
              <MatchBox key={m.id} m={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
