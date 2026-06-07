import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PICK_LOCK_MINUTES,
  POINTS,
  PHASE_META,
  TOURNAMENT_QUESTIONS,
  type Phase,
} from "@/lib/constants";
import {
  Clock,
  Trophy,
  Target,
  ListOrdered,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

const phases = (Object.entries(PHASE_META) as [Phase, (typeof PHASE_META)[Phase]][]).sort(
  (a, b) => a[1].order - b[1].order,
);

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="card-hover animate-fade-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
            <Icon className="size-4 text-primary" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm leading-relaxed text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

export default async function RegelnPage() {
  await requireUser();
  const t = getDictionary();
  const r = t.rules;
  const tiebreakers = [r.tb1, r.tb2, r.tb3, r.tb4, r.tb5];
  const maxBonus = TOURNAMENT_QUESTIONS.reduce((s, q) => s + q.points, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{r.title}</h1>
        <p className="text-sm text-muted-foreground">{r.subtitle}</p>
      </div>

      <Section icon={Target} title={r.s1}>
        <p>{r.s1p1}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <div className="text-lg font-bold text-foreground">1</div>
            <div className="text-xs">{r.s1home}</div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <div className="text-lg font-bold text-foreground">X</div>
            <div className="text-xs">{r.s1draw}</div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <div className="text-lg font-bold text-foreground">2</div>
            <div className="text-xs">{r.s1away}</div>
          </div>
        </div>
        <p className="mt-3">{r.s1p2}</p>
      </Section>

      <Section icon={Clock} title={r.s2}>
        <p>{r.s2p1(PICK_LOCK_MINUTES)}</p>
        <p className="mt-2">{r.s2p2}</p>
      </Section>

      <Section icon={Trophy} title={r.s3}>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
            <span className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="size-4 text-primary" /> {r.s3correct}
            </span>
            <Badge variant="success" className="text-sm">
              {POINTS.CORRECT_OUTCOME} {t.common.points}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <span className="flex items-center gap-2">
              <XCircle className="size-4 text-red-300" /> {r.s3wrong}
            </span>
            <Badge variant="secondary" className="text-sm">
              {POINTS.WRONG} {t.common.points}
            </Badge>
          </div>
        </div>
        <p className="mt-3">{r.s3p}</p>
      </Section>

      <Section icon={Sparkles} title={r.bonusTitle}>
        <p>{r.bonusIntro}</p>
        <div className="mt-3 space-y-1.5">
          {TOURNAMENT_QUESTIONS.map((q) => (
            <div
              key={q.key}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2"
            >
              <span className="text-foreground">
                {(t.bonusQ as Record<string, { label: string }>)[q.key]?.label ?? q.label}
              </span>
              <Badge variant="secondary" className="shrink-0">
                {q.points} {t.common.points}
              </Badge>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 px-3 pt-1.5">
            <span className="font-semibold text-foreground">{r.bonusTotal}</span>
            <Badge variant="success" className="shrink-0 text-sm">
              {maxBonus} {t.common.points}
            </Badge>
          </div>
        </div>
      </Section>

      <Section icon={Zap} title={r.jokerTitle}>
        <p>{r.jokerP}</p>
      </Section>

      <Section icon={ListOrdered} title={r.s4}>
        <p>{r.s4p}</p>
        <ol className="mt-2 space-y-1">
          {tiebreakers.map((tb, i) => (
            <li key={tb} className="flex items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                {i + 1}
              </span>
              {tb}
            </li>
          ))}
        </ol>
      </Section>

      <Section icon={EyeOff} title={r.s5}>
        <p>{r.s5p}</p>
      </Section>

      <Section icon={ShieldCheck} title={r.s6}>
        <p>{r.s6p}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {phases.map(([key]) => (
            <Badge key={key} variant="outline">
              {t.phase[key].label}
            </Badge>
          ))}
        </div>
      </Section>
    </div>
  );
}
