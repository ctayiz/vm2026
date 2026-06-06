"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/** Markiert das Onboarding für den aktuellen Nutzer als abgeschlossen (einmalig). */
export async function completeOnboardingAction(): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!user.onboardedAt) {
    await db.user.update({ where: { id: user.id }, data: { onboardedAt: new Date() } });
  }
  return { ok: true };
}
