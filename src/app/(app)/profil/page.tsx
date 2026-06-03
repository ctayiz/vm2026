import { requireUser, isAdmin } from "@/lib/auth";
import { logoutAction } from "@/server/auth-actions";
import { ProfileForm } from "@/components/profile-form";
import { FavoritesPicker, type FavTeam } from "@/components/favorites-picker";
import { getFavoriteTeams } from "@/lib/queries";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Star } from "lucide-react";
import { MAX_FAVORITES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const user = await requireUser();
  const [teams, favorites] = await Promise.all([
    db.team.findMany({
      orderBy: [{ group: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true, flagCode: true, group: true },
    }),
    getFavoriteTeams(user.id),
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Profil</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            Konto
            {isAdmin(user) && <Badge variant="warning">Admin</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm displayName={user.displayName} avatarUrl={user.avatarUrl} />
        </CardContent>
      </Card>

      <Card id="favoriten" className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="size-4 fill-amber-300 text-amber-300" />
            Lieblingsländer
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Wähle bis zu {MAX_FAVORITES} Favoriten. Sie werden im Spielplan oben hervorgehoben.
          </p>
        </CardHeader>
        <CardContent>
          <FavoritesPicker teams={teams as FavTeam[]} initialIds={favorites.map((t) => t.id)} />
        </CardContent>
      </Card>

      <form action={logoutAction}>
        <Button variant="outline" type="submit" className="w-full">
          <LogOut className="size-4" /> Abmelden
        </Button>
      </form>
    </div>
  );
}
