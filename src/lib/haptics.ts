// Dezente Vibrations-Rückmeldung auf dem Handy (Vibration API).
// Wird ignoriert, wenn das Gerät/der Browser es nicht unterstützt
// (z. B. iOS Safari) – dann passiert einfach nichts.

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* manche Browser werfen bei Nutzer-Gesten-Policy – ignorieren */
  }
}

/** Kurzer „Tap" – z. B. beim Antippen einer Auswahl. */
export function tapHaptic(): void {
  vibrate(12);
}

/** Erfolgs-Muster – z. B. nach gespeichertem Tipp. */
export function successHaptic(): void {
  vibrate([10, 35, 18]);
}

/** Kräftigeres Muster – z. B. beim Zünden des Jokers. */
export function jokerHaptic(): void {
  vibrate([0, 25, 30, 40]);
}
