import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMatches } from "@/lib/queries";
import { MatchCard } from "@/components/match-card";
import { Card, CardContent } from "@/components/ui/card";
import { isPickLocked } from "@/lib/lock";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MeineTippsPage() {
  const user = await requireUser();
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
        <h1 className="text-2xl font-bold">Meine Tipps</h1>
        <p className="text-sm text-muted-foreground">
          {predicted.length} abgegebene Tipps · {finished.length} gewertet
        </p>
      </div>

      {openCount > 0 && (
        <Link href="/spielplan?filter=offen">
          <Card className="border-primary/40 bg-primary/10 transition-colors hover:bg-primary/15">
            <CardContent className="flex items-center justify-between py-3">
              <span className="text-sm font-medium">
                Du hast noch {openCount} offene{openCount === 1 ? "s" : ""} Spiel
                {openCount === 1 ? "" : "e"} ohne Tipp.
              </span>
              <ArrowRight className="size-4 text-primary" />
            </CardContent>
          </Card>
        </Link>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Anstehend</h2>
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Gewertet</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {finished.map((m, i) => (
              <MatchCard key={m.id} match={m} index={i} />
            ))}
          </div>
        </section>
      )}

      {predicted.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Noch keine Tipps abgegeben.{" "}
          <Link href="/spielplan" className="font-medium text-primary hover:underline">
            Jetzt zum Spielplan
          </Link>
        </p>
      )}
    </div>
  );
}
