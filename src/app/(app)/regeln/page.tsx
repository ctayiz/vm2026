import { requireUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PICK_LOCK_MINUTES, POINTS, PHASE_META, type Phase } from "@/lib/constants";
import {
  Clock,
  Trophy,
  Target,
  ListOrdered,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

const phases = (Object.entries(PHASE_META) as [Phase, (typeof PHASE_META)[Phase]][]).sort(
  (a, b) => a[1].order - b[1].order,
);

const tiebreakers = [
  "Mehr Gesamtpunkte",
  "Mehr richtige Tipps",
  "Bessere Trefferquote",
  "Frühere Registrierung",
  "Alphabetisch nach Anzeigename",
];

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

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Regeln & Punktesystem</h1>
        <p className="text-sm text-muted-foreground">So funktioniert das WM-2026-Tippspiel.</p>
      </div>

      <Section icon={Target} title="So wird getippt">
        <p>
          Für jedes Spiel tippst du den Ausgang nach dem <strong>1X2-Prinzip</strong>:
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <div className="text-lg font-bold text-foreground">1</div>
            <div className="text-xs">Heimsieg</div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <div className="text-lg font-bold text-foreground">X</div>
            <div className="text-xs">Unentschieden</div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-3">
            <div className="text-lg font-bold text-foreground">2</div>
            <div className="text-xs">Auswärtssieg</div>
          </div>
        </div>
        <p className="mt-3">
          Pro Spiel ist genau <strong>ein Tipp</strong> möglich. Du kannst ihn beliebig oft ändern – bis
          zum Tipp-Schluss.
        </p>
      </Section>

      <Section icon={Clock} title="Tipp-Schluss">
        <p>
          Ein Tipp lässt sich bis <strong>{PICK_LOCK_MINUTES} Minuten vor Anpfiff</strong> abgeben oder
          ändern. Ab dann ist das Spiel <strong>gesperrt</strong> – ein nachträglicher Tipp oder eine
          Änderung ist nicht mehr möglich.
        </p>
        <p className="mt-2">
          Ein <span className="font-medium text-foreground">Countdown</span> auf jeder Spielkarte zeigt
          die verbleibende Zeit. Die Sperre wird serverseitig geprüft – nichts lässt sich umgehen.
        </p>
      </Section>

      <Section icon={Trophy} title="Punktesystem">
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
            <span className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="size-4 text-primary" /> Richtiger Ausgang (Sieger oder
              Unentschieden)
            </span>
            <Badge variant="success" className="text-sm">
              {POINTS.CORRECT_OUTCOME} Punkte
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3">
            <span className="flex items-center gap-2">
              <XCircle className="size-4 text-red-300" /> Falscher Tipp
            </span>
            <Badge variant="secondary" className="text-sm">
              {POINTS.WRONG} Punkte
            </Badge>
          </div>
        </div>
        <p className="mt-3">
          Es zählt allein die <strong>Tendenz</strong> – das genaue Ergebnis spielt im MVP keine Rolle.
          Punkte werden automatisch vergeben, sobald der Admin das Ergebnis einträgt.
        </p>
      </Section>

      <Section icon={ListOrdered} title="Ranking & Gleichstand">
        <p>Das Leaderboard sortiert nach folgender Reihenfolge:</p>
        <ol className="mt-2 space-y-1">
          {tiebreakers.map((t, i) => (
            <li key={t} className="flex items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">
                {i + 1}
              </span>
              {t}
            </li>
          ))}
        </ol>
      </Section>

      <Section icon={EyeOff} title="Fairness">
        <p>
          Die Tipps der anderen Mitspieler bleiben bis zum Tipp-Schluss <strong>verborgen</strong>,
          damit sich niemand beeinflussen lässt. Erst danach werden Verteilungen sichtbar.
        </p>
      </Section>

      <Section icon={ShieldCheck} title="Turnierphasen">
        <p>
          Die WM 2026 umfasst 48 Teams. Getippt wird über alle Phasen hinweg – inklusive der neuen
          Runde der letzten 32:
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {phases.map(([key, meta]) => (
            <Badge key={key} variant="outline">
              {meta.label}
            </Badge>
          ))}
        </div>
      </Section>
    </div>
  );
}
