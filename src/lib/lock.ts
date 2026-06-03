import { PICK_LOCK_MINUTES } from "./constants";

/**
 * Zeitpunkt, ab dem ein Tipp gesperrt ist (Anpfiff minus PICK_LOCK_MINUTES).
 */
export function getLockTime(kickoff: Date, lockMinutes = PICK_LOCK_MINUTES): Date {
  return new Date(kickoff.getTime() - lockMinutes * 60_000);
}

/**
 * Ist der Tipp für dieses Spiel zum Zeitpunkt `now` gesperrt?
 * Gesperrt = wir sind am Lock-Zeitpunkt oder danach.
 */
export function isPickLocked(kickoff: Date, now: Date = new Date(), lockMinutes = PICK_LOCK_MINUTES): boolean {
  return now.getTime() >= getLockTime(kickoff, lockMinutes).getTime();
}

/**
 * Verbleibende Millisekunden bis Tipp-Schluss (0 wenn bereits gesperrt).
 */
export function msUntilLock(kickoff: Date, now: Date = new Date(), lockMinutes = PICK_LOCK_MINUTES): number {
  return Math.max(0, getLockTime(kickoff, lockMinutes).getTime() - now.getTime());
}
