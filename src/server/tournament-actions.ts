"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { tournamentBetSchema } from "@/lib/validation";
import { getTournamentLock } from "@/lib/queries";
import { getQuestion } from "@/lib/constants";

export type TournamentBetState = { ok: boolean; error?: string };

/**
 * Turnier-Tipp abgeben/ändern. Serverseitig erzwungen:
 *  - eingeloggt
 *  - gültige Frage + existierendes Team
 *  - Tipp-Schluss (Anpfiff erstes Spiel) noch nicht erreicht
 */
export async function submitTournamentBetAction(
  _prev: TournamentBetState,
  formData: FormData,
): Promise<TournamentBetState> {
  const user = await requireUser();

  const parsed = tournamentBetSchema.safeParse({
    questionKey: formData.get("questionKey"),
    teamId: formData.get("teamId") ?? "",
    playerId: formData.get("playerId") ?? "",
  });
  if (!parsed.success) return { ok: false, error: "Ungültiger Tipp." };
  const { questionKey, teamId, playerId } = parsed.data;

  const question = getQuestion(questionKey);
  if (!question) return { ok: false, error: "Unbekannte Frage." };

  const { locked } = await getTournamentLock();
  if (locked) {
    return { ok: false, error: "Turnier-Tipps sind seit Anpfiff gesperrt." };
  }

  // je nach Frage Team- ODER Spieler-Tipp prüfen
  if (question.pick === "PLAYER") {
    if (!playerId || !(await db.player.findUnique({ where: { id: playerId } }))) {
      return { ok: false, error: "Spieler nicht gefunden." };
    }
    await db.tournamentBet.upsert({
      where: { userId_questionKey: { userId: user.id, questionKey } },
      update: { playerId, teamId: null, points: null, scored: false },
      create: { userId: user.id, questionKey, playerId },
    });
  } else {
    if (!teamId || !(await db.team.findUnique({ where: { id: teamId } }))) {
      return { ok: false, error: "Team nicht gefunden." };
    }
    await db.tournamentBet.upsert({
      where: { userId_questionKey: { userId: user.id, questionKey } },
      update: { teamId, playerId: null, points: null, scored: false },
      create: { userId: user.id, questionKey, teamId },
    });
  }

  revalidatePath("/turnier-tipps");
  return { ok: true };
}
