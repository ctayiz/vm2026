"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { resultSchema, teamProgressSchema } from "@/lib/validation";
import { syncSchedule } from "@/lib/sync-service";
import { rescoreMatch, rescoreAll, rescoreTournamentBets } from "@/lib/scoring-service";
import { syncTopScorers, syncMatchGoals } from "@/lib/stats-service";

export type AdminState = { ok: boolean; error?: string; message?: string };

export async function syncScheduleAction(): Promise<AdminState> {
  await requireAdmin();
  const s = await syncSchedule();
  revalidatePath("/spielplan");
  revalidatePath("/admin");
  return {
    ok: true,
    message: `Quelle: ${s.source} · ${s.created} neu, ${s.updated} aktualisiert (gesamt ${s.total}).${s.note ? " " + s.note : ""}`,
  };
}

export async function setResultAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdmin();
  const parsed = resultSchema.safeParse({
    matchId: formData.get("matchId"),
    homeGoals: formData.get("homeGoals"),
    awayGoals: formData.get("awayGoals"),
    status: formData.get("status") ?? "finished",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }
  const { matchId, homeGoals, awayGoals, status } = parsed.data;

  const match = await db.match.findUnique({ where: { id: matchId } });
  if (!match) return { ok: false, error: "Spiel nicht gefunden." };

  await db.match.update({
    where: { id: matchId },
    data: { homeGoals, awayGoals, status },
  });

  // Scoring automatisch nach Ergebnisspeicherung neu berechnen.
  const r = await rescoreMatch(matchId);

  revalidatePath("/admin");
  revalidatePath("/spielplan");
  revalidatePath("/ranking");
  return { ok: true, message: `Ergebnis gespeichert · ${r.scored} Tipps ausgewertet.` };
}

/**
 * Turnier-Fortschritt eines Teams setzen (tiefste erreichte Runde / Weltmeister).
 * Danach werden die Turnier-Tipps automatisch neu bewertet.
 */
export async function setTeamProgressAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdmin();
  const parsed = teamProgressSchema.safeParse({
    teamId: formData.get("teamId"),
    reachedPhase: formData.get("reachedPhase") ?? "",
    isChampion: formData.get("isChampion") === "on" || formData.get("isChampion") === "true",
  });
  if (!parsed.success) return { ok: false, error: "Ungültige Eingabe." };
  const { teamId, reachedPhase, isChampion } = parsed.data;

  const team = await db.team.findUnique({ where: { id: teamId } });
  if (!team) return { ok: false, error: "Team nicht gefunden." };

  // Weltmeister ist auch Finalist -> reachedPhase mindestens FINAL.
  const effectivePhase = isChampion ? "FINAL" : reachedPhase || null;

  // Es kann nur einen Weltmeister geben.
  if (isChampion) {
    await db.team.updateMany({ where: { isChampion: true }, data: { isChampion: false } });
  }

  await db.team.update({
    where: { id: teamId },
    data: { reachedPhase: effectivePhase, isChampion: !!isChampion },
  });

  const r = await rescoreTournamentBets();
  revalidatePath("/admin");
  revalidatePath("/ranking");
  revalidatePath("/turnier-tipps");
  return { ok: true, message: `${team.name} aktualisiert · ${r.scored} Turnier-Tipps neu bewertet.` };
}

/**
 * Live-Daten von API-Football holen: Torschützenliste + Spiel-Tore.
 * Danach Turnier-Tipps (Torschützenkönig) neu bewerten.
 */
export async function syncStatsAction(): Promise<AdminState> {
  await requireAdmin();
  const scorers = await syncTopScorers();
  const goals = await syncMatchGoals();
  await rescoreTournamentBets();

  revalidatePath("/statistiken");
  revalidatePath("/turnier-tipps");
  revalidatePath("/spielplan");
  revalidatePath("/ranking");

  if (!scorers.ok && !goals.ok) {
    return { ok: false, error: scorers.message };
  }
  return { ok: true, message: `${scorers.message} ${goals.ok ? goals.message : ""}`.trim() };
}

export async function recomputeAllAction(): Promise<AdminState> {
  await requireAdmin();
  const r = await rescoreAll();
  revalidatePath("/ranking");
  revalidatePath("/admin");
  return {
    ok: true,
    message: `Neu berechnet: ${r.scored} Spiel-Tipps in ${r.matches} Spielen · ${r.tournament} Turnier-Tipps.`,
  };
}

export async function toggleBlockUserAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { ok: false, error: "Kein Nutzer angegeben." };
  if (userId === admin.id) return { ok: false, error: "Du kannst dich nicht selbst sperren." };

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "Nutzer nicht gefunden." };

  await db.user.update({ where: { id: userId }, data: { blocked: !user.blocked } });
  revalidatePath("/admin");
  return { ok: true, message: user.blocked ? "Nutzer entsperrt." : "Nutzer gesperrt." };
}

export async function deleteUserAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { ok: false, error: "Kein Nutzer angegeben." };
  if (userId === admin.id) return { ok: false, error: "Du kannst dich nicht selbst löschen." };

  await db.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
  revalidatePath("/ranking");
  return { ok: true, message: "Nutzer gelöscht." };
}
