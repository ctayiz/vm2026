import { redirect } from "next/navigation";
import { Clock, BarChart3, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getLocale, getDictionary } from "@/lib/i18n-server";
import { KickoffCountdown } from "@/components/kickoff-countdown";
import { FlagTicker } from "@/components/flag-ticker";
import { Logo } from "@/components/logo";
import { I18nProvider } from "@/components/i18n-provider";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect("/spielplan");

  const locale = getLocale();
  const t = getDictionary();

  const FEATURES = [
    { icon: Clock, text: t.auth.feat1 },
    { icon: BarChart3, text: t.auth.feat2 },
    { icon: ShieldCheck, text: t.auth.feat3 },
  ];
  const STATS = [
    { value: "48", label: t.auth.statTeams },
    { value: "104", label: t.auth.statMatches },
    { value: "7", label: t.auth.statPhases },
  ];

  return (
    <I18nProvider locale={locale}>
      <div className="relative min-h-dvh overflow-hidden">
        {/* animierter Hintergrund */}
        <div className="absolute inset-0 -z-10">
          <div className="blob left-[-10%] top-[-10%] h-72 w-72 animate-blob bg-primary/40" />
          <div className="blob right-[-5%] top-[20%] h-80 w-80 animate-blob bg-sky-500/30 [animation-delay:4s]" />
          <div className="blob bottom-[-10%] left-[30%] h-72 w-72 animate-blob bg-emerald-500/25 [animation-delay:8s]" />
        </div>

        <div className="container grid min-h-dvh items-center gap-10 py-10 lg:grid-cols-2 lg:gap-16">
          {/* HERO */}
          <section className="order-1 flex flex-col gap-6">
            <div className="flex items-center text-foreground">
              <Logo className="h-9" />
            </div>

            <div className="space-y-3">
              <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                {t.auth.heroLine1} <span className="text-gradient">{t.auth.heroBrand}</span>
                <br />
                {t.auth.heroLine2}
              </h1>
              <p className="max-w-md text-pretty text-base text-muted-foreground sm:text-lg">
                {t.auth.heroSubtitle}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {t.auth.kickoffIn}
              </p>
              <KickoffCountdown />
            </div>

            <div className="flex gap-3">
              {STATS.map((s, i) => (
                <div
                  key={s.label}
                  className="glass animate-fade-up rounded-xl px-4 py-2 text-center"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="text-xl font-bold text-foreground">{s.value}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            <ul className="hidden flex-col gap-2 sm:flex">
              {FEATURES.map((f) => (
                <li key={f.text} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <f.icon className="size-4 text-primary" />
                  {f.text}
                </li>
              ))}
            </ul>

            <div className="hidden lg:block">
              <FlagTicker />
            </div>
          </section>

          {/* FORM */}
          <section className="order-2 flex w-full justify-center lg:justify-end">
            <div className="w-full max-w-sm animate-fade-up">{children}</div>
          </section>
        </div>
      </div>
    </I18nProvider>
  );
}
