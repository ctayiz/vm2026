"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { predictionSchema } from "@/lib/validation";
import { isPickLocked } from "@/lib/lock";

export type PredictionState = { ok: boolean; error?: string; prediction?: string };

/**
 * Tipp abgeben oder ändern. Alle Regeln werden SERVERSEITIG erzwungen:
 *  - Nutzer eingeloggt
 *  - Spiel existiert
 *  - Prediction-Wert gültig (Zod)
 *  - Tipp-Schluss (15 Min vor Anpfiff) noch nicht erreicht
 */
export async function submitPredictionAction(
  _prev: PredictionState,
  formData: FormData,
): Promise<PredictionState> {
  const user = await requireUser();

  const parsed = predictionSchema.safeParse({
    matchId: formData.get("matchId"),
    prediction: formData.get("prediction"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Ungültiger Tipp." };
  }
  const { matchId, prediction } = parsed.data;

  const match = await db.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return { ok: false, error: "Spiel nicht gefunden." };
  }

  // Lock-Prüfung mit Server-Zeit (nicht manipulierbar durch Client).
  if (isPickLocked(match.kickoff)) {
    return { ok: false, error: "Tipp-Schluss erreicht – dieser Tipp ist gesperrt." };
  }

  await db.prediction.upsert({
    where: { userId_matchId: { userId: user.id, matchId } },
    update: { prediction },
    create: { userId: user.id, matchId, prediction },
  });

  revalidatePath("/spielplan");
  revalidatePath("/meine-tipps");
  return { ok: true, prediction };
}

export type JokerState = { ok: boolean; error?: string; active?: boolean };

/**
 * Joker für ein Spiel setzen/entfernen. Regeln (serverseitig):
 *  - es muss bereits ein Tipp für das Spiel existieren
 *  - Spiel noch nicht gesperrt
 *  - max. 1 Joker pro Turnierphase; ein bereits gesperrter Joker blockiert die Phase
 */
export async function toggleJokerAction(_prev: JokerState, formData: FormData): Promise<JokerState> {
  const user = await requireUser();
  const matchId = String(formData.get("matchId") ?? "");
  if (!matchId) return { ok: false, error: "Kein Spiel angegeben." };

  const match = await db.match.findUnique({ where: { id: matchId } });
  if (!match) return { ok: false, error: "Spiel nicht gefunden." };
  if (isPickLocked(match.kickoff)) {
    return { ok: false, error: "Spiel ist gesperrt – Joker nicht änderbar." };
  }

  const own = await db.prediction.findUnique({
    where: { userId_matchId: { userId: user.id, matchId } },
  });
  if (!own) return { ok: false, error: "Bitte zuerst einen Tipp abgeben." };

  // bereits Joker -> entfernen
  if (own.isJoker) {
    await db.prediction.update({ where: { id: own.id }, data: { isJoker: false } });
    revalidatePath("/spielplan");
    revalidatePath("/meine-tipps");
    return { ok: true, active: false };
  }

  // Joker dieser Phase finden (über zugehörige Matches)
  const phaseJokers = await db.prediction.findMany({
    where: { userId: user.id, isJoker: true, match: { phase: match.phase } },
    include: { match: { select: { kickoff: true } } },
  });
  const lockedJoker = phaseJokers.find((p) => isPickLocked(p.match.kickoff));
  if (lockedJoker) {
    return { ok: false, error: "Joker in dieser Phase bereits vergeben (Spiel gesperrt)." };
  }

  // offenen Joker derselben Phase verschieben (entfernen) + hier setzen
  await db.$transaction([
    db.prediction.updateMany({
      where: { userId: user.id, isJoker: true, match: { phase: match.phase } },
      data: { isJoker: false },
    }),
    db.prediction.update({ where: { id: own.id }, data: { isJoker: true } }),
  ]);

  revalidatePath("/spielplan");
  revalidatePath("/meine-tipps");
  return { ok: true, active: true };
}
