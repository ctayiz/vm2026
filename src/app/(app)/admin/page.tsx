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

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();

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
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-sm text-muted-foreground">
          {matches.length} Spiele · {finishedCount} abgeschlossen · {users.length} Nutzer
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <SyncButton />
        <SyncStatsButton />
        <RecomputeButton />
      </div>

      <Tabs defaultValue="ergebnisse">
        <TabsList>
          <TabsTrigger value="ergebnisse">Ergebnisse</TabsTrigger>
          <TabsTrigger value="turnier">Turnier</TabsTrigger>
          <TabsTrigger value="nutzer">Nutzer</TabsTrigger>
        </TabsList>

        <TabsContent value="ergebnisse">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ergebnisse eintragen / korrigieren</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 p-0">
              {matches.map((m) => (
                <div key={m.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Flag code={m.homeTeam?.flagCode} />
                      <span className="truncate">{m.homeTeam?.name ?? m.homePlaceholder ?? "offen"}</span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="truncate">{m.awayTeam?.name ?? m.awayPlaceholder ?? "offen"}</span>
                      <Flag code={m.awayTeam?.flagCode} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{PHASE_META[m.phase as Phase]?.short}</Badge>
                      <span>{formatDateTime(m.kickoff)}</span>
                      {m.status === "finished" && <Badge variant="success">abgeschlossen</Badge>}
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
              <CardTitle className="text-base">Turnier-Fortschritt der Teams</CardTitle>
              <p className="text-sm text-muted-foreground">
                Setze pro Team die tiefste erreichte Runde und markiere den Weltmeister 👑. Danach
                werden die Turnier-Tipps automatisch neu bewertet.
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
                  Noch keine Teams – bitte zuerst den Spielplan synchronisieren.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nutzer">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nutzerübersicht</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border/60 p-0">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{u.displayName}</span>
                      {u.role === "ADMIN" && <Badge variant="warning">Admin</Badge>}
                      {u.blocked && <Badge variant="destructive">gesperrt</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {u.email} · {u._count.predictions} Tipps
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
