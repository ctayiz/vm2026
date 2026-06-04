// Sehr einfaches In-Memory-Rate-Limit (Sliding Window). Pro Server-Instanz,
// reicht als Brute-Force-Bremse für ein kleines privates Projekt. Auf Serverless
// nicht über Instanzen geteilt – bewusst leichtgewichtig gehalten.

const buckets = new Map<string, number[]>();

/** true = erlaubt, false = blockiert (Limit erreicht). */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  // gelegentliches Aufräumen, damit die Map nicht unbegrenzt wächst
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return true;
}
