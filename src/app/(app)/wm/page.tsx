import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getTournamentFacts } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Flag } from "@/components/flag";
import { KickoffCountdown } from "@/components/kickoff-countdown";
import { VENUES, HOST_COUNTRIES } from "@/lib/venues";
import { formatDate } from "@/lib/format";
import { getLocale, getDictionary } from "@/lib/i18n-server";
import { BracketIcon } from "@/components/bracket-icon";
import { Users, Layers, CalendarDays, Building2, Flag as FlagIcon, Trophy, ArrowRight, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

function Fact({ icon: Icon, value, label }: { icon: React.ElementType; value: React.ReactNode; label: string }) {
  return (
    <div className="glass flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-center">
      <Icon className="size-4 text-primary" />
      <span className="text-xl font-bold tabular-nums leading-none">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

function Explore({
  href,
  icon: Icon,
  title,
  sub,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  sub: string;
}) {
  return (
    <Link href={href}>
      <Card className="card-hover h-full">
        <CardContent className="flex items-center gap-3 py-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-semibold leading-tight">{title}</div>
            <div className="truncate text-xs text-muted-foreground">{sub}</div>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function WmPage() {
  await requireUser();
  const t = getDictionary();
  const locale = getLocale();
  const facts = await getTournamentFacts();

  return (
    <div className="space-y-5">
      {/* HERO mit Countdown */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
        <div className="blob right-[-15%] top-[-60%] h-48 w-48 animate-blob bg-primary/30" />
        <div className="relative space-y-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              <span className="text-gradient">{t.wm.title}</span>
            </h1>
            <p className="text-sm text-muted-foreground">{t.wm.subtitle}</p>
          </div>
          <div>
            <div className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              {t.wm.openingIn}
            </div>
            <KickoffCountdown />
          </div>
        </div>
      </div>

      {/* Eckdaten */}
      <div className="grid grid-cols-2 gap-3 xs:grid-cols-4">
        <Fact icon={Users} value={facts.teams} label={t.wm.factTeams} />
        <Fact icon={Layers} value={facts.groups} label={t.wm.factGroups} />
        <Fact icon={CalendarDays} value={facts.matches} label={t.wm.factMatches} />
        <Fact icon={Building2} value={VENUES.length} label={t.wm.factVenues} />
      </div>

      {/* Eröffnung / Finale / Gastgeber */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <FlagIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.wm.opening}</div>
              <div className="truncate text-sm font-semibold">
                {facts.opening ? formatDate(facts.opening, locale) : "—"}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-400/40">
          <CardContent className="flex items-center gap-3 py-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
              <Trophy className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.wm.final}</div>
              <div className="truncate text-sm font-semibold">
                {facts.final ? formatDate(facts.final, locale) : "—"}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
              <MapPin className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t.wm.hosts}</div>
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                {HOST_COUNTRIES.map((c) => (
                  <Flag key={c.name} code={c.flagCode} className="text-base" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entdecken */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Explore href="/wm/gruppen" icon={Layers} title={t.wm.exploreGroups} sub={t.wm.exploreGroupsSub} />
        <Explore href="/wm/stadien" icon={Building2} title={t.wm.exploreVenues} sub={t.wm.exploreVenuesSub} />
        <Explore href="/turnierbaum" icon={BracketIcon} title={t.wm.exploreBracket} sub={t.wm.exploreBracketSub} />
      </div>
    </div>
  );
}
