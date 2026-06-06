import { requireUser } from "@/lib/auth";
import { Flag } from "@/components/flag";
import { Card, CardContent } from "@/components/ui/card";
import { HOST_COUNTRIES, VENUES } from "@/lib/venues";
import { getDictionary } from "@/lib/i18n-server";
import { MapPin, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StadienPage() {
  await requireUser();
  const t = getDictionary();

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
        <div className="blob right-[-15%] top-[-60%] h-40 w-40 animate-blob bg-sky-500/25" />
        <div className="relative">
          <h1 className="text-2xl font-bold">{t.wm.venuesTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.wm.venuesSubtitle}</p>
        </div>
      </div>

      {HOST_COUNTRIES.map((country) => {
        const venues = VENUES.filter((v) => v.country === country.name);
        return (
          <section key={country.name} className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Flag code={country.flagCode} className="text-lg" />
              {country.name}
              <span className="text-muted-foreground/60">({venues.length})</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {venues.map((v, i) => (
                <Card
                  key={v.stadium}
                  className="card-hover animate-fade-up"
                  style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                >
                  <CardContent className="space-y-1 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold leading-tight">{v.stadium}</span>
                      <Flag code={v.flagCode} className="shrink-0 text-base" />
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="truncate">{v.city}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="size-3.5 shrink-0" />
                      {v.capacity.toLocaleString("de-DE")} {t.wm.capacity}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
