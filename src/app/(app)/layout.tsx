import Link from "next/link";
import { Trophy, LogOut, BookOpen, Network } from "lucide-react";
import { requireUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/server/auth-actions";
import { Nav } from "@/components/nav";
import { UserAvatar } from "@/components/user-avatar";
import { AutoSync } from "@/components/auto-sync";
import { Button } from "@/components/ui/button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const admin = isAdmin(user);

  return (
    <div className="flex min-h-dvh flex-col">
      <AutoSync />
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
        <div className="container flex h-14 items-center justify-between gap-4">
          <Link href="/spielplan" className="flex items-center gap-2 font-bold">
            <Trophy className="size-5 text-primary" />
            <span className="hidden sm:inline">WM 2026 Tippspiel</span>
            <span className="sm:hidden">WM 2026</span>
          </Link>

          <Nav isAdmin={admin} />

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild aria-label="Turnierbaum">
              <Link href="/turnierbaum">
                <Network className="size-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild aria-label="Regeln & Punktesystem">
              <Link href="/regeln">
                <BookOpen className="size-4" />
              </Link>
            </Button>
            <Link href="/profil" className="flex items-center gap-2">
              <UserAvatar value={user.avatarUrl} name={user.displayName} size="sm" />
              <span className="hidden text-sm font-medium lg:inline">{user.displayName}</span>
            </Link>
            <form action={logoutAction}>
              <Button variant="ghost" size="icon" type="submit" aria-label="Abmelden">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container flex-1 py-5 pb-24 md:pb-8">{children}</main>
    </div>
  );
}
