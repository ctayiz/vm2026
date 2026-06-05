"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n-server";
import { MAX_FAVORITES } from "@/lib/constants";

export type FavoriteState = { ok: boolean; error?: string; favorites?: string[] };

/**
 * Lieblingsland hinzufügen/entfernen. Max. MAX_FAVORITES.
 * Gibt die aktuelle Liste der favorisierten Team-IDs zurück.
 */
export async function toggleFavoriteAction(
  _prev: FavoriteState,
  formData: FormData,
): Promise<FavoriteState> {
  const user = await requireUser();
  const t = getDictionary();
  const teamId = String(formData.get("teamId") ?? "");
  if (!teamId) return { ok: false, error: t.msg.noTeamGiven };

  const existing = await db.favorite.findUnique({
    where: { userId_teamId: { userId: user.id, teamId } },
  });

  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
  } else {
    const count = await db.favorite.count({ where: { userId: user.id } });
    if (count >= MAX_FAVORITES) {
      return { ok: false, error: t.msg.favMax(MAX_FAVORITES) };
    }
    if (!(await db.team.findUnique({ where: { id: teamId } }))) {
      return { ok: false, error: t.msg.teamNotFound };
    }
    await db.favorite.create({ data: { userId: user.id, teamId, position: count } });
  }

  const favorites = await db.favorite.findMany({
    where: { userId: user.id },
    select: { teamId: true },
  });

  // Kein revalidatePath: der Picker aktualisiert seinen Zustand selbst, und ein
  // Re-Render würde das Speichern verzögern. /spielplan ist force-dynamic und
  // zeigt die Favoriten beim nächsten Aufruf ohnehin frisch.
  return { ok: true, favorites: favorites.map((f) => f.teamId) };
}
