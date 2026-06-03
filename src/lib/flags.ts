// Flaggen-Helfer. Wir speichern pro Team einen ISO-3166-alpha-2-Code (flagCode)
// und rendern daraus ein Flaggen-Emoji (Regional Indicator Symbols) – funktioniert
// offline und ohne externes CDN. Alternativ kann flagcdn.com genutzt werden.

/** alpha-2 (z. B. "de") -> Flaggen-Emoji 🇩🇪 */
export function flagEmoji(alpha2?: string | null): string {
  if (!alpha2 || alpha2.length !== 2) return "🏳️";
  const base = 0x1f1e6;
  const cc = alpha2.toUpperCase();
  return String.fromCodePoint(base + (cc.charCodeAt(0) - 65), base + (cc.charCodeAt(1) - 65));
}

/** Optionaler CDN-URL (falls Bild statt Emoji gewünscht). */
export function flagCdnUrl(alpha2?: string | null, width: 20 | 40 | 80 | 160 = 40): string | null {
  if (!alpha2 || alpha2.length !== 2) return null;
  return `https://flagcdn.com/w${width}/${alpha2.toLowerCase()}.png`;
}
