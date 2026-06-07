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
import { I18nProvider } from "@/components/i18n-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const admin = isAdmin(user);
  const locale = getLocale();
  const t = getDictionary();

  return (
    <I18nProvider locale={locale}>
      {/* KEIN overflow-x:clip hier – auf dem min-h-dvh-Wrapper macht iOS-Safari
          daraus einen Scroll-Container und der sticky-Header überlappt dann den
          Inhalt ("Hallo" hinter der Leiste). Horizontaler Schutz läuft über die
          16px-Inputs (kein Auto-Zoom) + html{overflow-x:clip}. */}
      <div className="min-h-dvh w-full max-w-full">
        <AutoSync />
        <OnboardingModal initialOpen={!user.onboardedAt} />
        {/* Wrapper ist KEIN Flex-Container (sonst rendert iOS sticky wie fixed
            und der Inhalt rutscht unter den Header). Im normalen Block-Fluss
            reserviert sticky korrekt Platz -> Leiste oben sichtbar, kein Overlap. */}
        <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
          <div className="container flex h-14 items-center justify-between gap-4">
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

        <main className="container w-full max-w-full py-5 pb-24 md:pb-8">
          {children}
        </main>
      </div>
    </I18nProvider>
  );
}
