import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MapPin, CalendarDays, User, Shirt, BarChart3, ListOrdered, Goal, ArrowRightLeft, Square } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getMatchById } from "@/lib/queries";
import { fetchFixtureDetail, type FixtureDetail, type ApiLineup, type FixtureEvent } from "@/lib/api-football";
import { apiNameToCode } from "@/lib/live-score-service";
import { getDictionary, getLocale } from "@/lib/i18n-server";
import { Flag } from "@/components/flag";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dayLabel, formatTime } from "@/lib/format";
import { localizePlaceholder } from "@/lib/team-map";
import { PHASE_META, type Phase } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Side = { name: string; flagCode: string | null; code: string | null };

export default async function MatchDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const t = getDictionary();
  const locale = getLocale();

  const match = await getMatchById(params.id, user.id);
  if (!match) notFound();

  let detail: FixtureDetail | null = null;
  let loadError = false;
  if (match.apiFixtureId) {
    try {
      detail = await fetchFixtureDetail(Number(match.apiFixtureId));
    } catch {
      loadError = true;
    }
  }

  // API-Teamname -> unser Team (deutscher Name + Flagge), per FIFA-Code.
  const teamByCode = new Map<string, { name: string; flagCode: string | null; code: string }>();
  if (match.homeTeam) teamByCode.set(match.homeTeam.code, match.homeTeam);
  if (match.awayTeam) teamByCode.set(match.awayTeam.code, match.awayTeam);
  const resolveApi = (apiName: string): Side => {
    const code = apiNameToCode(apiName);
    const our = code ? teamByCode.get(code) : null;
    return { name: our?.name ?? apiName, flagCode: our?.flagCode ?? null, code: code ?? null };
  };

  // Kopf-Orientierung: wenn API-Detail da ist, dieser folgen; sonst unsere DB.
  const home: Side = detail
    ? resolveApi(detail.home.name)
    : {
        name: match.homeTeam?.name ?? localizePlaceholder(match.homePlaceholder, t.placeholder) ?? "—",
        flagCode: match.homeTeam?.flagCode ?? null,
        code: match.homeTeam?.code ?? null,
      };
  const away: Side = detail
    ? resolveApi(detail.away.name)
    : {
        name: match.awayTeam?.name ?? localizePlaceholder(match.awayPlaceholder, t.placeholder) ?? "—",
        flagCode: match.awayTeam?.flagCode ?? null,
        code: match.awayTeam?.code ?? null,
      };

  const gh = detail ? detail.goalsHome : match.homeGoals;
  const ga = detail ? detail.goalsAway : match.awayGoals;
  const hasScore = gh != null && ga != null;
  const live = match.status === "live";
  const finished = match.status === "finished";
  const phase = match.phase as Phase;
  const roundLabel = phase === "GROUP" && match.group ? `${t.groupName} ${match.group}` : t.phase[phase]?.label;

  // welche Seite (home/away) gehört ein API-Teamname? (für Events/Lineups/Stats)
  const sideOf = (apiName: string): "home" | "away" | null => {
    if (!detail) return null;
    if (apiName === detail.home.name) return "home";
    if (apiName === detail.away.name) return "away";
    const c = apiNameToCode(apiName);
    if (c && home.code === c) return "home";
    if (c && away.code === c) return "away";
    return null;
  };

  const subScores: { label: string; value: string }[] = [];
  if (detail) {
    const s = detail.score;
    const fmt = (p: [number | null, number | null]) => (p[0] != null && p[1] != null ? `${p[0]}:${p[1]}` : null);
    const ht = fmt(s.halftime);
    const et = fmt(s.extratime);
    const pen = fmt(s.penalty);
    if (ht) subScores.push({ label: t.matchDetail.halftime, value: ht });
    if (et) subScores.push({ label: t.matchDetail.extraTime, value: et });
    if (pen) subScores.push({ label: t.matchDetail.penalties, value: pen });
  }

  return (
    <div className="space-y-5">
      <Link
        href="/spielplan"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> {t.matchDetail.back}
      </Link>

      {/* KOPF */}
      <Card className={cn("overflow-hidden", live && "border-red-500/40")}>
        <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30 px-4 py-2 text-xs">
          <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
            {PHASE_META[phase]?.knockout && <span className="text-amber-300">🏆</span>}
            {roundLabel}
          </span>
          {live ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-400">
              <span className="size-1.5 animate-glow-pulse rounded-full bg-red-500" /> {t.match.live}
              {detail?.elapsed != null && <span className="ml-0.5">{detail.elapsed}&apos;</span>}
            </span>
          ) : finished ? (
            <Badge variant="success">{t.match.finished}</Badge>
          ) : (
            <span className="text-muted-foreground">{t.matchDetail.upcoming}</span>
          )}
        </div>

        <CardContent className="py-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-col items-center gap-2 text-center">
              <Flag code={home.flagCode} className="text-5xl drop-shadow sm:text-6xl" />
              <div className="font-bold leading-tight">{home.name}</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              {hasScore ? (
                <span
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-3xl font-black tabular-nums",
                    live ? "bg-red-500/20 text-red-300" : "bg-secondary",
                  )}
                >
                  {gh} : {ga}
                </span>
              ) : (
                <span className="text-2xl font-black text-muted-foreground">{t.match.vsShort}</span>
              )}
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <Flag code={away.flagCode} className="text-5xl drop-shadow sm:text-6xl" />
              <div className="font-bold leading-tight">{away.name}</div>
            </div>
          </div>

          {subScores.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {subScores.map((s) => (
                <span key={s.label}>
                  {s.label}: <span className="font-semibold tabular-nums text-foreground">{s.value}</span>
                </span>
              ))}
            </div>
          )}

          {/* Meta */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3.5" /> {dayLabel(match.kickoff, locale)} · {formatTime(match.kickoff, locale)}
            </span>
            {(detail?.venue || match.venue) && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" /> {detail?.venue ?? match.venue}
                {(detail?.city || match.city) ? `, ${detail?.city ?? match.city}` : ""}
              </span>
            )}
            {detail?.referee && (
              <span className="flex items-center gap-1">
                <User className="size-3.5" /> {detail.referee}
              </span>
            )}
          </div>

          {/* Eigener Tipp */}
          {match.myPrediction && (
            <div className="mt-4 flex items-center justify-center">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                {t.match.yourTip}{" "}
                <span className="font-semibold text-foreground">
                  {match.myPrediction === "HOME_WIN" ? t.outcome.home : match.myPrediction === "AWAY_WIN" ? t.outcome.away : t.outcome.draw}
                </span>
                {finished && match.myScored && (
                  <span className={cn("ml-1 font-semibold", (match.myPoints ?? 0) > 0 ? "text-primary" : "text-muted-foreground")}>
                    · {t.match.plusPoints(match.myPoints ?? 0)}
                  </span>
                )}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SPIELVERLAUF */}
      {detail && detail.events.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <ListOrdered className="size-4" /> {t.matchDetail.events}
          </h2>
          <Card>
            <CardContent className="divide-y divide-border/50 p-0">
              {detail.events.map((e, i) => (
                <EventRow key={i} ev={e} side={sideOf(e.teamName)} t={t} />
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* AUFSTELLUNGEN */}
      {detail && detail.lineups.length > 0 ? (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Shirt className="size-4" /> {t.matchDetail.lineups}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {detail.lineups.map((l) => (
              <LineupCard key={l.teamName} lineup={l} side={resolveApi(l.teamName)} t={t} />
            ))}
          </div>
        </section>
      ) : (
        detail && (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            {t.matchDetail.noLineup}
          </p>
        )
      )}

      {/* STATISTIK */}
      {detail && detail.statistics.length >= 2 && (
        <StatsSection detail={detail} t={t} />
      )}

      {/* keine Detaildaten */}
      {!detail && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {loadError ? t.matchDetail.loadError : t.matchDetail.noData}
        </p>
      )}
    </div>
  );
}

/* ----------------------------- Sub-Komponenten ---------------------------- */

function eventMeta(ev: FixtureEvent, t: ReturnType<typeof getDictionary>) {
  const type = ev.type.toLowerCase();
  const detail = (ev.detail ?? "").toLowerCase();
  if (type === "goal") {
    const label = detail.includes("own") ? t.matchDetail.ownGoal : detail.includes("penalty") && detail.includes("missed") ? t.matchDetail.missedPenalty : detail.includes("penalty") ? t.matchDetail.penaltyGoal : t.matchDetail.goal;
    return { icon: <Goal className="size-3.5 text-primary" />, label };
  }
  if (type === "card") {
    const red = detail.includes("red");
    return {
      icon: <Square className={cn("size-3.5", red ? "fill-red-500 text-red-500" : "fill-amber-400 text-amber-400")} />,
      label: red ? t.matchDetail.redCard : t.matchDetail.yellowCard,
    };
  }
  if (type === "subst") {
    return { icon: <ArrowRightLeft className="size-3.5 text-sky-400" />, label: t.matchDetail.substitution };
  }
  return { icon: <span className="size-3.5" />, label: ev.detail ?? ev.type };
}

function EventRow({ ev, side, t }: { ev: FixtureEvent; side: "home" | "away" | null; t: ReturnType<typeof getDictionary> }) {
  const { icon, label } = eventMeta(ev, t);
  const minute = ev.minute != null ? `${ev.minute}${ev.extra ? "+" + ev.extra : ""}'` : "";
  return (
    <div className={cn("flex items-center gap-2 px-4 py-2 text-sm", side === "away" && "flex-row-reverse text-right")}>
      <span className="w-9 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{minute}</span>
      {icon}
      <div className="min-w-0 flex-1">
        <span className="font-medium">{ev.playerName ?? "—"}</span>
        {ev.assistName && (
          <span className="text-xs text-muted-foreground"> · {ev.assistName}</span>
        )}
        <span className="ml-1 text-xs text-muted-foreground">({label})</span>
      </div>
    </div>
  );
}

function LineupCard({ lineup, side, t }: { lineup: ApiLineup; side: Side; t: ReturnType<typeof getDictionary> }) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border/60 bg-secondary/30 px-4 py-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Flag code={side.flagCode} className="text-base" /> {side.name}
        </span>
        {lineup.formation && (
          <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
            {lineup.formation}
          </span>
        )}
      </div>
      <CardContent className="space-y-3 py-3">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t.matchDetail.startXI}
          </div>
          <ul className="space-y-0.5 text-sm">
            {lineup.startXI.map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{p.number ?? ""}</span>
                <span className="truncate">{p.name}</span>
                {p.pos && <span className="ml-auto text-[10px] uppercase text-muted-foreground">{p.pos}</span>}
              </li>
            ))}
          </ul>
        </div>
        {lineup.substitutes.length > 0 && (
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t.matchDetail.substitutes}
            </div>
            <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {lineup.substitutes.map((p, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className="tabular-nums">{p.number ?? ""}</span> {p.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        {lineup.coach && (
          <div className="text-xs text-muted-foreground">
            {t.matchDetail.coach}: <span className="font-medium text-foreground">{lineup.coach}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatsSection({ detail, t }: { detail: FixtureDetail; t: ReturnType<typeof getDictionary> }) {
  const homeStats = detail.statistics[0];
  const awayStats = detail.statistics[1];
  const byType = new Map<string, { home: string | number | null; away: string | number | null }>();
  for (const s of homeStats.stats) byType.set(s.type, { home: s.value, away: null });
  for (const s of awayStats.stats) {
    const e = byType.get(s.type) ?? { home: null, away: null };
    e.away = s.value;
    byType.set(s.type, e);
  }
  const toNum = (v: string | number | null): number => {
    if (v == null) return 0;
    if (typeof v === "number") return v;
    return parseFloat(String(v).replace("%", "")) || 0;
  };
  const rows = [...byType.entries()].filter(([, v]) => v.home != null || v.away != null);

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <BarChart3 className="size-4" /> {t.matchDetail.statistics}
      </h2>
      <Card>
        <CardContent className="space-y-2.5 py-4">
          {rows.map(([type, v]) => {
            const h = toNum(v.home);
            const a = toNum(v.away);
            const sum = h + a;
            const hp = sum > 0 ? (h / sum) * 100 : 50;
            return (
              <div key={type} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold tabular-nums">{v.home ?? "–"}</span>
                  <span className="text-muted-foreground">{t.matchDetail.stat[type] ?? type}</span>
                  <span className="font-semibold tabular-nums">{v.away ?? "–"}</span>
                </div>
                <div className="flex h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="bg-primary" style={{ width: `${hp}%` }} />
                  <div className="bg-sky-400/70" style={{ width: `${100 - hp}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}
