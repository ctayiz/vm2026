import { requireUser } from "@/lib/auth";
import { getGroupStandings } from "@/lib/queries";
import { GroupTable } from "@/components/group-table";
import { getDictionary } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function GruppenPage() {
  await requireUser();
  const t = getDictionary();
  const groups = await getGroupStandings();
  const anyResults = groups.some((g) => g.rows.some((r) => r.played > 0));

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
        <div className="blob right-[-15%] top-[-60%] h-40 w-40 animate-blob bg-primary/25" />
        <div className="relative">
          <h1 className="text-2xl font-bold">{t.wm.groupsTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.wm.groupsSubtitle}</p>
        </div>
      </div>

      {!anyResults && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t.wm.noStandings}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g, i) => (
          <GroupTable key={g.group} group={g.group} rows={g.rows} index={i} />
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-primary" /> {t.wm.legendQualified}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-300" /> {t.wm.legendThird}
        </span>
      </div>
    </div>
  );
}
