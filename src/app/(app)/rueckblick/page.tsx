import { requireUser } from "@/lib/auth";
import { getUserRecap } from "@/lib/queries";
import { HistoryView } from "@/components/history-view";
import { getDictionary } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function RueckblickPage() {
  const user = await requireUser();
  const t = getDictionary();
  const recap = await getUserRecap(user.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t.recap.title}</h1>
        <p className="text-sm text-muted-foreground">{t.recap.subtitle}</p>
      </div>
      <HistoryView data={recap} />
    </div>
  );
}
