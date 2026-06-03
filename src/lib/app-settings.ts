import { db } from "./db";

/** Liest einen App-Einstellungswert (Key/Value), null wenn nicht gesetzt. */
export async function getSetting(key: string): Promise<string | null> {
  const row = await db.appSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

/** Schreibt einen App-Einstellungswert (Upsert). */
export async function setSetting(key: string, value: string): Promise<void> {
  await db.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/**
 * Throttle-Helfer: gibt true zurück (und merkt sich "jetzt"), wenn seit dem
 * letzten Mal mehr als `minMs` vergangen sind. Sonst false.
 * Setzt den Zeitstempel SOFORT, um parallele Mehrfach-Läufe zu verhindern.
 */
export async function shouldRun(key: string, minMs: number, now: number = Date.now()): Promise<boolean> {
  const last = await getSetting(key);
  if (last && now - Number(last) < minMs) return false;
  await setSetting(key, String(now));
  return true;
}
