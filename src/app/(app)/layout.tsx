import Link from "next/link";
import { LogOut, BookOpen } from "lucide-react";
import { Logo } from "@/components/logo";
import { requireUser, isAdmin } from "@/lib/auth";
import { getLocale, getDictionary } from "@/lib/i18n-server";
import { logoutAction } from "@/server/auth-actions";
import { Nav } from "@/components/nav";
import { UserAvatar } from "@/components/user-avatar";
import { AutoSync } from "@/components/auto-sync";
import { OnboardingModal } from "@/components/onboarding-modal";
import { KoDrawModal } from "@/components/ko-draw-modal";
import { WinnerModal } from "@/components/winner-modal";
import { FarewellModal } from "@/components/farewell-modal";
import { getFinaleCelebration, getFarewellData } from "@/lib/queries";
import { ScrollReset } from "@/components/scroll-reset";
import { I18nProvider } from "@/components/i18n-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const admin = isAdmin(user);
  const locale = getLocale();
  const t = getDictionary();
  // Nur laden, solange der Nutzer das Sieger-Modal noch nicht gesehen hat –
  // danach entfällt die Abfrage bei jedem Seitenaufruf komplett.
  const celebration = user.winnerModalSeenAt ? null : await getFinaleCelebration();
  // Danke-Modal kommt NACH dem Sieger-Modal: erst laden, wenn das Sieger-Modal
  // bereits gesehen und das Danke-Modal noch nicht bestätigt wurde. Gibt selbst
  // null zurück, solange das Turnier nicht beendet ist.
  const farewell =
    user.winnerModalSeenAt && !user.farewellModalSeenAt ? await getFarewellData(user.id) : null;

  return (
    <I18nProvider locale={locale}>
      {/* KEIN overflow-x:clip hier – auf dem min-h-dvh-Wrapper macht iOS-Safari
          daraus einen Scroll-Container und der sticky-Header überlappt dann den
          Inhalt ("Hallo" hinter der Leiste). Horizontaler Schutz läuft über die
          16px-Inputs (kein Auto-Zoom) + html{overflow-x:clip}. */}
      <div className="min-h-dvh w-full max-w-full">
        <AutoSync />
        <ScrollReset />
        <OnboardingModal initialOpen={!user.onboardedAt} />
        {/* Nach dem Finale hat das Sieger-Modal Vorrang – der KO-Tipp-Hinweis
            ist dann ohnehin gegenstandslos und würde sich sonst überlagern. */}
        <KoDrawModal initialOpen={!user.koModalSeenAt && !celebration && !farewell} />
        {celebration && <WinnerModal data={celebration} />}
        {farewell && <FarewellModal data={farewell} />}
        {/* fixed + fester pt am Inhalt = deterministisch: Leiste immer oben
            sichtbar, Inhalt IMMER darunter (kein sticky-in-flex-Bug auf iOS). */}
        <header className="fixed inset-x-0 top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between gap-4 px-4">
            <Link href="/spielplan" className="flex items-center text-foreground">
              <Logo className="h-7" />
            </Link>

            <Nav isAdmin={admin} />

            <div className="flex items-center gap-2">
              <LanguageToggle className="hidden sm:inline-flex" />
              <Button variant="ghost" size="icon" asChild aria-label={t.nav.rules}>
                <Link href="/regeln">
                  <BookOpen className="size-4" />
                </Link>
              </Button>
              <Link href="/profil" className="flex items-center gap-2">
                <UserAvatar value={user.avatarUrl} name={user.displayName} size="sm" />
                <span className="hidden text-sm font-medium lg:inline">{user.displayName}</span>
              </Link>
              <form action={logoutAction}>
                <Button variant="ghost" size="icon" type="submit" aria-label={t.nav.logout}>
                  <LogOut className="size-4" />
                </Button>
              </form>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-[4.5rem] md:pb-8">
          {children}
        </main>
      </div>
    </I18nProvider>
  );
}
