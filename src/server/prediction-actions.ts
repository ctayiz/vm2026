"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n-server";
import { predictionSchema } from "@/lib/validation";
import { isPickLocked } from "@/lib/lock";
import { MAX_JOKERS, PHASE_META, type Phase } from "@/lib/constants";

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
  const t = getDictionary();

  const parsed = predictionSchema.safeParse({
    matchId: formData.get("matchId"),
    prediction: formData.get("prediction"),
  });
  if (!parsed.success) {
    return { ok: false, error: t.msg.invalidTip };
  }
  const { matchId, prediction } = parsed.data;

  const match = await db.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return { ok: false, error: t.msg.matchNotFound };
  }

  // K.-o.-Phase: kein Unentschieden möglich (Verlängerung/Elfmeter) – serverseitig erzwingen.
  if (prediction === "DRAW" && PHASE_META[match.phase as Phase]?.knockout) {
    return { ok: false, error: t.msg.noDrawKnockout };
  }

  // Lock-Prüfung mit Server-Zeit (nicht manipulierbar durch Client).
  if (isPickLocked(match.kickoff)) {
    return { ok: false, error: t.msg.lockReached };
  }

  await db.prediction.upsert({
    where: { userId_matchId: { userId: user.id, matchId } },
    update: { prediction },
    create: { userId: user.id, matchId, prediction },
  });

  // KEIN revalidatePath hier: das würde die ganze Spielplan-Seite serverseitig
  // neu rendern (inkl. Leaderboard) und die Bestätigung um Sekunden verzögern.
  // Die Auswahl wird im UI optimistisch angezeigt; beim nächsten Seitenaufruf
  // (force-dynamic) sind die Daten ohnehin frisch.
  return { ok: true, prediction };
}

export type JokerState = { ok: boolean; error?: string; active?: boolean };

/**
 * Joker für ein Spiel setzen/entfernen. Regeln (serverseitig):
 *  - es muss bereits ein Tipp für das Spiel existieren
 *  - Spiel noch nicht gesperrt
 *  - max. 3 Joker pro Nutzer fürs gesamte Turnier (frei verteilbar). Bereits
 *    gesperrte Joker zählen weiter mit und können nicht mehr entfernt werden.
 */
export async function toggleJokerAction(_prev: JokerState, formData: FormData): Promise<JokerState> {
  const user = await requireUser();
  const t = getDictionary();
  const matchId = String(formData.get("matchId") ?? "");
  if (!matchId) return { ok: false, error: t.msg.matchNotFound };

  const match = await db.match.findUnique({ where: { id: matchId } });
  if (!match) return { ok: false, error: t.msg.matchNotFound };
  if (isPickLocked(match.kickoff)) {
    return { ok: false, error: t.msg.jokerLocked };
  }

  const own = await db.prediction.findUnique({
    where: { userId_matchId: { userId: user.id, matchId } },
  });
  if (!own) return { ok: false, error: t.msg.jokerTipFirst };

  // bereits Joker -> entfernen
  if (own.isJoker) {
    await db.prediction.update({ where: { id: own.id }, data: { isJoker: false } });
    return { ok: true, active: false };
  }

  // Obergrenze prüfen: max. 3 aktive Joker insgesamt
  const jokerCount = await db.prediction.count({
    where: { userId: user.id, isJoker: true },
  });
  if (jokerCount >= MAX_JOKERS) {
    return { ok: false, error: t.msg.jokerLimit };
  }

  await db.prediction.update({ where: { id: own.id }, data: { isJoker: true } });
  return { ok: true, active: true };
}
