// Mapping der englischen Team-Namen aus der OpenFootball-Quelle auf
// deutschen Namen, FIFA-Kürzel und ISO-3166-alpha-2 (für Flaggen).
// Deckt das vollständige Teilnehmerfeld der WM 2026 ab.

export interface TeamInfo {
  code: string; // FIFA-/Kürzel (uppercase)
  name: string; // deutscher Name
  flagCode: string; // ISO alpha-2 (lowercase)
}

export const TEAM_MAP: Record<string, TeamInfo> = {
  Algeria: { code: "ALG", name: "Algerien", flagCode: "dz" },
  Argentina: { code: "ARG", name: "Argentinien", flagCode: "ar" },
  Australia: { code: "AUS", name: "Australien", flagCode: "au" },
  Austria: { code: "AUT", name: "Österreich", flagCode: "at" },
  Belgium: { code: "BEL", name: "Belgien", flagCode: "be" },
  "Bosnia & Herzegovina": { code: "BIH", name: "Bosnien-Herzegowina", flagCode: "ba" },
  Brazil: { code: "BRA", name: "Brasilien", flagCode: "br" },
  Canada: { code: "CAN", name: "Kanada", flagCode: "ca" },
  "Cape Verde": { code: "CPV", name: "Kap Verde", flagCode: "cv" },
  Colombia: { code: "COL", name: "Kolumbien", flagCode: "co" },
  Croatia: { code: "CRO", name: "Kroatien", flagCode: "hr" },
  Curaçao: { code: "CUW", name: "Curaçao", flagCode: "cw" },
  "Czech Republic": { code: "CZE", name: "Tschechien", flagCode: "cz" },
  "DR Congo": { code: "COD", name: "DR Kongo", flagCode: "cd" },
  Ecuador: { code: "ECU", name: "Ecuador", flagCode: "ec" },
  Egypt: { code: "EGY", name: "Ägypten", flagCode: "eg" },
  England: { code: "ENG", name: "England", flagCode: "gb" },
  France: { code: "FRA", name: "Frankreich", flagCode: "fr" },
  Germany: { code: "GER", name: "Deutschland", flagCode: "de" },
  Ghana: { code: "GHA", name: "Ghana", flagCode: "gh" },
  Haiti: { code: "HAI", name: "Haiti", flagCode: "ht" },
  Iran: { code: "IRN", name: "Iran", flagCode: "ir" },
  Iraq: { code: "IRQ", name: "Irak", flagCode: "iq" },
  "Ivory Coast": { code: "CIV", name: "Elfenbeinküste", flagCode: "ci" },
  Japan: { code: "JPN", name: "Japan", flagCode: "jp" },
  Jordan: { code: "JOR", name: "Jordanien", flagCode: "jo" },
  Mexico: { code: "MEX", name: "Mexiko", flagCode: "mx" },
  Morocco: { code: "MAR", name: "Marokko", flagCode: "ma" },
  Netherlands: { code: "NED", name: "Niederlande", flagCode: "nl" },
  "New Zealand": { code: "NZL", name: "Neuseeland", flagCode: "nz" },
  Norway: { code: "NOR", name: "Norwegen", flagCode: "no" },
  Panama: { code: "PAN", name: "Panama", flagCode: "pa" },
  Paraguay: { code: "PAR", name: "Paraguay", flagCode: "py" },
  Portugal: { code: "POR", name: "Portugal", flagCode: "pt" },
  Qatar: { code: "QAT", name: "Katar", flagCode: "qa" },
  "Saudi Arabia": { code: "KSA", name: "Saudi-Arabien", flagCode: "sa" },
  Scotland: { code: "SCO", name: "Schottland", flagCode: "gb" },
  Senegal: { code: "SEN", name: "Senegal", flagCode: "sn" },
  "South Africa": { code: "RSA", name: "Südafrika", flagCode: "za" },
  "South Korea": { code: "KOR", name: "Südkorea", flagCode: "kr" },
  Spain: { code: "ESP", name: "Spanien", flagCode: "es" },
  Sweden: { code: "SWE", name: "Schweden", flagCode: "se" },
  Switzerland: { code: "SUI", name: "Schweiz", flagCode: "ch" },
  Tunisia: { code: "TUN", name: "Tunesien", flagCode: "tn" },
  Turkey: { code: "TUR", name: "Türkei", flagCode: "tr" },
  USA: { code: "USA", name: "USA", flagCode: "us" },
  Uruguay: { code: "URU", name: "Uruguay", flagCode: "uy" },
  Uzbekistan: { code: "UZB", name: "Usbekistan", flagCode: "uz" },
};

// API-Football/andere Quellen nutzen teils abweichende Namen für Nationalteams.
export const TEAM_ALIASES: Record<string, string> = {
  "Korea Republic": "South Korea",
  "United States": "USA",
  "USA ": "USA",
  "IR Iran": "Iran",
  "Cote d'Ivoire": "Ivory Coast",
  "Côte d'Ivoire": "Ivory Coast",
  Czechia: "Czech Republic",
  Turkiye: "Turkey",
  Türkiye: "Turkey",
  "Cabo Verde": "Cape Verde",
  "Cape Verde Islands": "Cape Verde",
  "Bosnia-Herzegovina": "Bosnia & Herzegovina",
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "Congo DR": "DR Congo",
};

/** Englischen Namen -> TeamInfo, falls echtes Team (kein Platzhalter). */
export function lookupTeam(name: string | undefined | null): TeamInfo | null {
  if (!name) return null;
  const key = name.trim();
  return TEAM_MAP[key] ?? TEAM_MAP[TEAM_ALIASES[key] ?? ""] ?? null;
}

/**
 * Beliebiges Team (auch unbekannte) auf eine Team-Referenz bringen:
 * bekannt -> deutscher Name + Code + Flagge; sonst Fallback mit Originalnamen.
 */
export function resolveTeamRef(
  name: string | undefined | null,
): { code: string; name: string; flagCode?: string } | undefined {
  if (!name || !name.trim()) return undefined;
  const info = lookupTeam(name);
  if (info) return { code: info.code, name: info.name, flagCode: info.flagCode };
  // Unbekanntes Team trotzdem aufnehmen (Originalname, Code aus den ersten 3 Buchstaben)
  const clean = name.trim();
  return { code: clean.slice(0, 3).toUpperCase(), name: clean };
}

/** Lokalisierungs-Wörter für K.-o.-Platzhalter (aus dem i18n-Wörterbuch). */
export interface PlaceholderWords {
  groupRank: (rank: number, letter: string) => string;
  third: (groups: string) => string;
  winnerMatch: (n: string) => string;
  loserMatch: (n: string) => string;
}

/**
 * Lokalisiert einen OpenFootball-Platzhalter-Token ("1A", "2B", "3A/B/C/D/F",
 * "W73", "L101") in die jeweilige Sprache. Roher Token bleibt gespeichert,
 * Übersetzung passiert erst beim Rendern -> mehrsprachig.
 */
export function localizePlaceholder(
  token: string | null | undefined,
  w: PlaceholderWords,
): string | null {
  if (!token) return null;
  const t = token.trim();
  let m = /^([12])([A-L])$/.exec(t);
  if (m) return w.groupRank(Number(m[1]), m[2]);
  if (/^3[A-L](\/[A-L])+$/.test(t)) return w.third(t.slice(1));
  m = /^W(\d+)$/.exec(t);
  if (m) return w.winnerMatch(m[1]);
  m = /^L(\d+)$/.exec(t);
  if (m) return w.loserMatch(m[1]);
  return t;
}
