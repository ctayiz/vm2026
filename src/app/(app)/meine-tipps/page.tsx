import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMatches } from "@/lib/queries";
import { MatchCard } from "@/components/match-card";
import { Card, CardContent } from "@/components/ui/card";
import { isPickLocked } from "@/lib/lock";
import { getDictionary } from "@/lib/i18n-server";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MeineTippsPage() {
  const user = await requireUser();
  const t = getDictionary();
  const all = await getMatches(user.id);

  const predicted = all.filter((m) => m.myPrediction);
  const upcoming = predicted.filter((m) => m.status !== "finished");
  const finished = predicted.filter((m) => m.status === "finished");
  const lockedJokerPhases = new Set(
    all.filter((m) => m.myJoker && isPickLocked(m.kickoff)).map((m) => m.phase),
  );
  const openCount = all.filter(
    (m) => m.status !== "finished" && !isPickLocked(m.kickoff) && !m.myPrediction,
  ).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t.myTips.title}</h1>
        <p className="text-sm text-muted-foreground">
          {t.myTips.subtitle(predicted.length, finished.length)}
        </p>
      </div>

      {openCount > 0 && (
        <Link href="/spielplan?filter=offen">
          <Card className="border-primary/40 bg-primary/10 transition-colors hover:bg-primary/15">
            <CardContent className="flex items-center justify-between py-3">
              <span className="text-sm font-medium">{t.myTips.openHint(openCount)}</span>
              <ArrowRight className="size-4 text-primary" />
            </CardContent>
          </Card>
        </Link>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t.myTips.upcoming}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((m, i) => (
              <MatchCard
                key={m.id}
                match={m}
                index={i}
                joker
                phaseJokerLocked={lockedJokerPhases.has(m.phase)}
              />
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t.myTips.scored}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {finished.map((m, i) => (
              <MatchCard key={m.id} match={m} index={i} />
            ))}
          </div>
        </section>
      )}

      {predicted.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t.myTips.none}{" "}
          <Link href="/spielplan" className="font-medium text-primary hover:underline">
            {t.myTips.toSchedule}
          </Link>
        </p>
      )}
    </div>
  );
}
