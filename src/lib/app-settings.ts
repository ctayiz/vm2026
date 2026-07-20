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
 *
 * ATOMAR (compare-and-swap): Nur der Aufruf, der den Zeitstempel exakt von
 * `last` auf `now` umsetzt, gewinnt (updateMany trifft genau 1 Zeile). Parallele
 * Aufrufe mit demselben `last` treffen 0 Zeilen -> false. Ohne diese Atomarität
 * lesen bei einem Live-Spiel viele offene Tabs/Nutzer denselben alten Zeitstempel,
 * bestehen alle den Check und lösen GLEICHZEITIG echte API-Abrufe aus – das
 * verbrennt das Tageskontingent von API-Football um ein Vielfaches.
 */
export async function shouldRun(key: string, minMs: number, now: number = Date.now()): Promise<boolean> {
  const last = await getSetting(key);
  if (last && now - Number(last) < minMs) return false;

  if (last == null) {
    // Key existiert noch nicht: anlegen. Bei Race (unique-Konflikt) als CAS behandeln.
    try {
      await db.appSetting.create({ data: { key, value: String(now) } });
      return true;
    } catch {
      const cur = await getSetting(key);
      if (cur && now - Number(cur) < minMs) return false;
      const res = await db.appSetting.updateMany({
        where: { key, value: cur ?? undefined },
        data: { value: String(now) },
      });
      return res.count > 0;
    }
  }

  const res = await db.appSetting.updateMany({
    where: { key, value: last },
    data: { value: String(now) },
  });
  return res.count > 0;
}
