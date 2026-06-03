import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flag } from "@/components/flag";
import {
  SyncButton,
  RecomputeButton,
  SyncStatsButton,
  ResultForm,
  UserRowActions,
  TeamProgressRow,
} from "@/components/admin/admin-actions-ui";
import { formatDateTime } from "@/lib/format";
import { PHASE_META, type Phase } from "@/lib/constants";
import { getLocale, getDictionary } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const t = getDictionary();
  const locale = getLocale();

  const [matches, users, finishedCount] = await Promise.all([
    db.match.findMany({
      orderBy: { kickoff: "asc" },
      include: { homeTeam: true, awayTeam: true },
    }),
    db.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        blocked: true,
        createdAt: true,
        _count: { select: { predictions: true } },
      },
    }),
    db.match.count({ where: { status: "finished" } }),
  ]);

  const teams = await db.team.findMany({ orderBy: [{ group: "asc" }, { name: "asc" }] });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t.admin.title}</h1>
        <p className="text-sm text-muted-foreground">
          {t.admin.overview(matches.length, finishedCount, users.length)}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <SyncButton />
        <SyncStatsButton />
        <RecomputeButton />
      </div>

      <Tabs defaultValue="ergebnisse">
        <TabsList>
          <TabsTrigger value="ergebnisse">{t.admin.tabResults}</TabsTrigger>
          <TabsTrigger value="turnier">{t.admin.tabTournament}</TabsTrigger>
          <TabsTrigger value="nutzer">{t.admin.tabUsers}</TabsTrigger>
        </TabsList>

        <TabsContent value="ergebnisse">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.admin.resultsTitle}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 p-0">
              {matches.map((m) => (
                <div key={m.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Flag code={m.homeTeam?.flagCode} />
                      <span className="truncate">{m.homeTeam?.name ?? m.homePlaceholder ?? "offen"}</span>
                      <span className="text-muted-foreground">{t.common.vs}</span>
                      <span className="truncate">{m.awayTeam?.name ?? m.awayPlaceholder ?? "offen"}</span>
                      <Flag code={m.awayTeam?.flagCode} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{PHASE_META[m.phase as Phase]?.short}</Badge>
                      <span>{formatDateTime(m.kickoff, locale)}</span>
                      {m.status === "finished" && <Badge variant="success">{t.admin.finishedBadge}</Badge>}
                    </div>
                  </div>
                  <ResultForm matchId={m.id} homeGoals={m.homeGoals} awayGoals={m.awayGoals} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="turnier">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.admin.progressTitle}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t.admin.progressHint}
              </p>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 p-0">
              {teams.map((t) => (
                <TeamProgressRow
                  key={t.id}
                  teamId={t.id}
                  name={t.name}
                  flagCode={t.flagCode}
                  group={t.group}
                  reachedPhase={t.reachedPhase}
                  isChampion={t.isChampion}
                />
              ))}
              {teams.length === 0 && (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  {t.admin.noTeams}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nutzer">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.admin.usersTitle}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 p-0">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{u.displayName}</span>
                      {u.role === "ADMIN" && <Badge variant="warning">{t.profile.admin}</Badge>}
                      {u.blocked && <Badge variant="destructive">{t.admin.blocked}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {u.email} · {u._count.predictions} {t.admin.tips}
                    </div>
                  </div>
                  {u.id !== admin.id && (
                    <UserRowActions userId={u.id} blocked={u.blocked} displayName={u.displayName} />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
