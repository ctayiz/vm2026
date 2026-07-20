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
  externalId: string;
  phase: string;
  kickoff: Date;
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
  winner: string | null;
  apiStatus: string | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  homeTeam: { name: string; code: string; flagCode: string | null } | null;
  awayTeam: { name: string; code: string; flagCode: string | null } | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
};

function Side({
  team,
  placeholder,
  goals,
  pens,
  winner,
  champion,
}: {
  team: BracketMatch["homeTeam"];
  placeholder: string | null;
  goals: number | null;
  pens?: number | null;
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
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {goals ?? "–"}
        {pens != null && <span className="ml-0.5 text-muted-foreground/70">({pens})</span>}
      </span>
    </div>
  );
}

function MatchBox({
  m,
  featured,
  resolveTeam,
}: {
  m: BracketMatch;
  featured?: boolean;
  resolveTeam?: (placeholder: string | null) => BracketMatch["homeTeam"];
}) {
  const t = getDictionary();
  const locale = getLocale();
  const finished = m.status === "finished" && m.homeGoals != null && m.awayGoals != null;
  const outcome = finished ? outcomeOf(m.homeGoals!, m.awayGoals!, m.winner as "HOME" | "AWAY" | null) : null;
  // Reale Mannschaft, sonst aufgelöster Sieger des Quellspiels, sonst Platzhalter.
  const homeTeam = m.homeTeam ?? resolveTeam?.(m.homePlaceholder) ?? null;
  const awayTeam = m.awayTeam ?? resolveTeam?.(m.awayPlaceholder) ?? null;
  // Elfmeterschießen nur anzeigen, wenn beide Stände vorliegen (apiStatus PEN).
  const isPen = m.apiStatus === "PEN" && m.homePenalties != null && m.awayPenalties != null;
  const decider = isPen ? t.bracket.afterPenalties : m.apiStatus === "AET" ? t.bracket.afterExtraTime : null;
  const footer = finished
    ? decider
      ? `${t.bracket.finished} (${decider})`
      : t.bracket.finished
    : formatDate(m.kickoff, locale);
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
        <Side team={homeTeam} placeholder={localizePlaceholder(m.homePlaceholder, t.placeholder)} goals={m.homeGoals} pens={isPen ? m.homePenalties : null} winner={outcome === "HOME_WIN"} champion={featured} />
        <div className="border-t border-border/50" />
        <Side team={awayTeam} placeholder={localizePlaceholder(m.awayPlaceholder, t.placeholder)} goals={m.awayGoals} pens={isPen ? m.awayPenalties : null} winner={outcome === "AWAY_WIN"} champion={featured} />
        <div className="border-t border-border/40 px-2 py-0.5 text-[9px] text-muted-foreground">
          {footer}
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
    <div className="flex w-5 shrink-0 flex-col sm:w-6">
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
 * Ordnet alle K.o.-Spalten exakt nach dem offiziellen FIFA-WM-2026-Turnierbaum.
 *
 * Die WM 2026 hat 72 Gruppenspiele → R32 = Spiel 73–88, R16 = 89–96,
 * VF = 97–100, HF = 101–102, Finale = 103. Die Spiel-Nummer je Runde ergibt
 * sich stabil aus der externalId (fd-XXXXXX) in aufsteigender Reihenfolge.
 *
 * Statt einer abgeleiteten Reihenfolge legen wir die R32-Slot-Position (oben→
 * unten) per offiziellem Bracket fest. Jedes spätere Spiel erhält als vertikale
 * Position den Mittelwert seiner beiden Vorgänger (über die W<n>-Platzhalter).
 * Dadurch stimmt die Anordnung 1:1 mit dem offiziellen Baum (Google/FIFA).
 */
/** Sieger eines beendeten Spiels (inkl. V/E über das winner-Feld), sonst null. */
function winnerTeamOf(m: BracketMatch): BracketMatch["homeTeam"] {
  if (m.status !== "finished" || m.homeGoals == null || m.awayGoals == null) return null;
  if (m.winner === "HOME") return m.homeTeam;
  if (m.winner === "AWAY") return m.awayTeam;
  if (m.homeGoals > m.awayGoals) return m.homeTeam;
  if (m.awayGoals > m.homeGoals) return m.awayTeam;
  return null;
}

function buildBracketCols(matches: BracketMatch[]): {
  cols: { phase: Phase; matches: BracketMatch[] }[];
  winnerByNum: Map<number, BracketMatch["homeTeam"]>;
} {
  const PHASE_START: Record<string, number> = {
    R32: 73, R16: 89, QF: 97, SF: 101, FINAL: 103,
  };
  const fdNum = (m: BracketMatch) => parseInt(m.externalId.replace(/\D/g, "")) || 0;
  const sortedByFdId = (p: string) =>
    matches.filter((m) => m.phase === p).sort((a, b) => fdNum(a) - fdNum(b));

  // Spiel-Nr. → Match  und  Match-Id → Spiel-Nr. (stabil über fd-Sortierung).
  const numToMatch = new Map<number, BracketMatch>();
  const matchToNum = new Map<string, number>();
  for (const [phase, start] of Object.entries(PHASE_START)) {
    sortedByFdId(phase).forEach((m, i) => {
      numToMatch.set(start + i, m);
      matchToNum.set(m.id, start + i);
    });
  }

  // Offizieller FIFA-WM-2026-Bracket: vertikaler R32-Slot (0 = oben) je R32-Nr.
  const R32_SLOT: Record<number, number> = {
    75: 0, 76: 1, 73: 2, 74: 3, 80: 4, 79: 5, 78: 6, 77: 7,
    81: 8, 82: 9, 83: 10, 84: 11, 87: 12, 88: 13, 86: 14, 85: 15,
  };

  const parseW = (s: string | null): number | null => {
    if (!s) return null;
    const m = s.match(/^[WL](\d+)$/);
    return m ? Number(m[1]) : null;
  };

  // Vertikale Position eines Spiels: R32 fix per Slot, sonst Mittel der Vorgänger.
  const posCache = new Map<string, number>();
  const posOf = (m: BracketMatch): number => {
    const cached = posCache.get(m.id);
    if (cached != null) return cached;
    if (m.phase === "R32") {
      const num = matchToNum.get(m.id);
      const p = num != null && R32_SLOT[num] != null ? R32_SLOT[num] : 999;
      posCache.set(m.id, p);
      return p;
    }
    const childPos: number[] = [];
    for (const ph of [m.homePlaceholder, m.awayPlaceholder]) {
      const num = parseW(ph);
      if (num == null) continue;
      const child = numToMatch.get(num);
      if (child) childPos.push(posOf(child));
    }
    const p = childPos.length ? childPos.reduce((a, b) => a + b, 0) / childPos.length : 999;
    posCache.set(m.id, p);
    return p;
  };

  // Sieger je Spiel-Nr. – damit Platzhalter "W75" zu "Kanada" aufgelöst werden,
  // sobald das Quellspiel beendet ist (auch wenn der Sieger noch nicht in das
  // Folgespiel synchronisiert wurde).
  const winnerByNum = new Map<number, BracketMatch["homeTeam"]>();
  for (const [num, m] of numToMatch) {
    const w = winnerTeamOf(m);
    if (w) winnerByNum.set(num, w);
  }

  const cols = COLUMNS.map((phase) => ({
    phase,
    matches: matches.filter((m) => m.phase === phase).sort((a, b) => posOf(a) - posOf(b)),
  })).filter((c) => c.matches.length > 0);

  return { cols, winnerByNum };
}

export default async function TurnierbaumPage() {
  await requireUser();
  const t = getDictionary();
  const matches = (await db.match.findMany({
    where: { phase: { in: ["R32", "R16", "QF", "SF", "TP", "FINAL"] } },
    orderBy: { kickoff: "asc" },
    include: { homeTeam: true, awayTeam: true },
  })) as unknown as BracketMatch[];

  const { cols, winnerByNum } = buildBracketCols(matches);
  const resolveTeam = (ph: string | null): BracketMatch["homeTeam"] => {
    const mm = ph?.match(/^W(\d+)$/);
    return mm ? (winnerByNum.get(Number(mm[1])) ?? null) : null;
  };
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
      <div className="hidden md:block">
        {/* Kopfzeile SEPARAT – die unterschiedlich hohen Überschriften (die erste
            bricht mehrzeilig um) dürfen das Box/Pfeil-Raster NICHT verschieben. */}
        <div className="flex items-end">
          {cols.map((c, i) => (
            <Fragment key={c.phase}>
              <div className="min-w-0 flex-1">
                <RoundHeader phase={c.phase} count={c.matches.length} />
              </div>
              {i < cols.length - 1 && <div className="w-5 shrink-0 sm:w-6" />}
            </Fragment>
          ))}
        </div>
        {/* Baum-Körper: alle Spalten + Pfeile exakt gleich hoch, OHNE Köpfe.
            Jede Box sitzt zentriert in einem gleich großen flex-1-Slot, sodass
            die Pfeilarme (25%/75%) der Folgespalte exakt die Box-Mitten treffen. */}
        <div className="mt-2 flex items-stretch">
          {cols.map((c, i) => (
            <Fragment key={c.phase}>
              <div className="flex min-w-0 flex-1 flex-col">
                {c.matches.map((m) => (
                  <div key={m.id} className="flex flex-1 items-center py-1">
                    <MatchBox m={m} featured={c.phase === "FINAL"} resolveTeam={resolveTeam} />
                  </div>
                ))}
              </div>
              {i < cols.length - 1 && (
                <Connectors nextCount={cols[i + 1].matches.length} gold={cols[i + 1].phase === "FINAL"} />
              )}
            </Fragment>
          ))}
        </div>
      </div>

      {/* MOBIL: Runden untereinander (kein Querscrollen) */}
      <div className="space-y-4 md:hidden">
        {cols.map((c) => (
          <section key={c.phase} className="space-y-2">
            <RoundHeader phase={c.phase} count={c.matches.length} />
            <div className="space-y-2">
              {c.matches.map((m) => (
                <MatchBox key={m.id} m={m} featured={c.phase === "FINAL"} resolveTeam={resolveTeam} />
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
