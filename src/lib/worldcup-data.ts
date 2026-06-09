// Eingebaute WM-2026-Stammdaten + Spielplan-Generator.
//
// Dient zwei Zwecken:
//  1. Garantierter Offline-Datensatz für Seed & als Fallback, falls die externe
//     Quelle (OpenFootball / API-Football) nicht erreichbar ist.
//  2. Vollständige 104-Spiele-Struktur (12 Gruppen, R32, AF, VF, HF, Platz 3, Finale),
//     inkl. WM-2026-spezifischer "Runde der letzten 32".
//
// Hinweis: Die konkreten Teamzuordnungen der K.o.-Runde sind Platzhalter
// ("Sieger Gruppe A" usw.), da die Paarungen erst nach der Gruppenphase feststehen.

import type { Phase } from "./constants";

export interface SeedTeam {
  code: string; // FIFA-/Kürzel, uppercase
  name: string; // deutscher Name
  flagCode: string; // ISO-3166 alpha-2 (für Flaggen-Emoji/CDN)
  group: string; // A..L
}

export interface NormalizedTeamRef {
  code: string;
  name: string;
  flagCode?: string;
}

export interface NormalizedMatch {
  externalId: string;
  phase: Phase;
  group?: string;
  roundLabel?: string;
  kickoff: string; // ISO (UTC)
  venue?: string;
  city?: string;
  home?: NormalizedTeamRef;
  away?: NormalizedTeamRef;
  homePlaceholder?: string;
  awayPlaceholder?: string;
  status: "scheduled" | "live" | "finished";
  homeGoals?: number | null;
  awayGoals?: number | null;
  // K.-o.-Sieger (Verlängerung/Elfmeter): "HOME" | "AWAY" | null
  winner?: "HOME" | "AWAY" | null;
}

// 48 Teams, 12 Gruppen à 4. (Illustratives Teilnehmerfeld.)
export const TEAMS: SeedTeam[] = [
  ["GER", "Deutschland", "de"], ["BRA", "Brasilien", "br"], ["ARG", "Argentinien", "ar"], ["FRA", "Frankreich", "fr"],
  ["ESP", "Spanien", "es"], ["ENG", "England", "gb"], ["POR", "Portugal", "pt"], ["NED", "Niederlande", "nl"],
  ["BEL", "Belgien", "be"], ["ITA", "Italien", "it"], ["CRO", "Kroatien", "hr"], ["URU", "Uruguay", "uy"],
  ["COL", "Kolumbien", "co"], ["MEX", "Mexiko", "mx"], ["USA", "USA", "us"], ["CAN", "Kanada", "ca"],
  ["JPN", "Japan", "jp"], ["KOR", "Südkorea", "kr"], ["SEN", "Senegal", "sn"], ["MAR", "Marokko", "ma"],
  ["SUI", "Schweiz", "ch"], ["DEN", "Dänemark", "dk"], ["SRB", "Serbien", "rs"], ["POL", "Polen", "pl"],
  ["AUT", "Österreich", "at"], ["UKR", "Ukraine", "ua"], ["SWE", "Schweden", "se"], ["GHA", "Ghana", "gh"],
  ["NGA", "Nigeria", "ng"], ["CMR", "Kamerun", "cm"], ["EGY", "Ägypten", "eg"], ["TUN", "Tunesien", "tn"],
  ["ALG", "Algerien", "dz"], ["ECU", "Ecuador", "ec"], ["PER", "Peru", "pe"], ["CHI", "Chile", "cl"],
  ["PAR", "Paraguay", "py"], ["AUS", "Australien", "au"], ["IRN", "Iran", "ir"], ["KSA", "Saudi-Arabien", "sa"],
  ["QAT", "Katar", "qa"], ["CRC", "Costa Rica", "cr"], ["PAN", "Panama", "pa"], ["JAM", "Jamaika", "jm"],
  ["NZL", "Neuseeland", "nz"], ["TUR", "Türkei", "tr"], ["GRE", "Griechenland", "gr"], ["SCO", "Schottland", "gb"],
].map(([code, name, flagCode], i) => ({
  code,
  name,
  flagCode,
  group: String.fromCharCode(65 + Math.floor(i / 4)), // A..L
}));

const GROUPS = Array.from(new Set(TEAMS.map((t) => t.group))); // [A..L]

const VENUES: Array<[string, string]> = [
  ["New York/New Jersey", "MetLife Stadium"],
  ["Los Angeles", "SoFi Stadium"],
  ["Dallas", "AT&T Stadium"],
  ["Kansas City", "Arrowhead Stadium"],
  ["Houston", "NRG Stadium"],
  ["Atlanta", "Mercedes-Benz Stadium"],
  ["Philadelphia", "Lincoln Financial Field"],
  ["Miami", "Hard Rock Stadium"],
  ["Seattle", "Lumen Field"],
  ["San Francisco", "Levi's Stadium"],
  ["Boston", "Gillette Stadium"],
  ["Mexiko-Stadt", "Estadio Azteca"],
  ["Guadalajara", "Estadio Akron"],
  ["Monterrey", "Estadio BBVA"],
  ["Toronto", "BMO Field"],
  ["Vancouver", "BC Place"],
];

// Turnierstart 11.06.2026. Slots: 4 Spiele/Tag (13/16/19/22 Uhr UTC).
const TOURNAMENT_START = Date.UTC(2026, 5, 11, 13, 0, 0);
const SLOT_HOURS = [13, 16, 19, 22];

function kickoffForSlot(slot: number): string {
  const day = Math.floor(slot / SLOT_HOURS.length);
  const hour = SLOT_HOURS[slot % SLOT_HOURS.length];
  const d = new Date(TOURNAMENT_START);
  d.setUTCDate(d.getUTCDate() + day);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

// Round-Robin-Paarungen innerhalb einer 4er-Gruppe (Indizes 0..3).
const RR_PAIRS: Array<[number, number]> = [
  [0, 1], [2, 3], // Spieltag 1
  [0, 2], [1, 3], // Spieltag 2
  [0, 3], [1, 2], // Spieltag 3
];

/**
 * Erzeugt den vollständigen Spielplan (104 Spiele) als normalisierte Matches.
 */
export function buildSchedule(): NormalizedMatch[] {
  const matches: NormalizedMatch[] = [];
  let num = 0;
  let venueIdx = 0;
  const nextVenue = () => VENUES[venueIdx++ % VENUES.length];

  // --- Gruppenphase (72 Spiele) ---
  // Pro Spieltag erst alle Gruppen, damit Termine über die Tage verteilt sind.
  for (let md = 0; md < 3; md++) {
    for (let g = 0; g < GROUPS.length; g++) {
      const groupTeams = TEAMS.filter((t) => t.group === GROUPS[g]);
      const pairs = RR_PAIRS.slice(md * 2, md * 2 + 2);
      for (const [a, b] of pairs) {
        const [city, venue] = nextVenue();
        const home = groupTeams[a];
        const away = groupTeams[b];
        num++;
        matches.push({
          externalId: `wm2026-${num}`,
          phase: "GROUP",
          group: GROUPS[g],
          roundLabel: `Gruppe ${GROUPS[g]}`,
          kickoff: kickoffForSlot(num - 1),
          venue,
          city,
          home: { code: home.code, name: home.name, flagCode: home.flagCode },
          away: { code: away.code, name: away.name, flagCode: away.flagCode },
          status: "scheduled",
        });
      }
    }
  }

  // Helper für K.o.-Platzhalter-Spiele.
  const koStartSlot = 18 * SLOT_HOURS.length; // nach 18 Gruppen-Tagen
  let koSlot = koStartSlot;
  const addKo = (
    phase: Phase,
    roundLabel: string,
    homePlaceholder: string,
    awayPlaceholder: string,
  ) => {
    const [city, venue] = nextVenue();
    num++;
    matches.push({
      externalId: `wm2026-${num}`,
      phase,
      roundLabel,
      kickoff: kickoffForSlot(koSlot++),
      venue,
      city,
      homePlaceholder,
      awayPlaceholder,
      status: "scheduled",
    });
    return num;
  };

  // --- Runde der letzten 32 (16 Spiele) ---
  const r32: number[] = [];
  for (let i = 0; i < 16; i++) {
    const g1 = GROUPS[i % GROUPS.length];
    const g2 = GROUPS[(i + 1) % GROUPS.length];
    const home = i % 2 === 0 ? `Sieger Gruppe ${g1}` : `Zweiter Gruppe ${g1}`;
    const away = i % 2 === 0 ? `Bester Dritter` : `Zweiter Gruppe ${g2}`;
    r32.push(addKo("R32", "Runde der letzten 32", home, away));
  }

  // --- Achtelfinale (8) ---
  const r16: number[] = [];
  for (let i = 0; i < 8; i++) {
    r16.push(
      addKo("R16", "Achtelfinale", `Sieger Spiel ${r32[i * 2]}`, `Sieger Spiel ${r32[i * 2 + 1]}`),
    );
  }

  // --- Viertelfinale (4) ---
  const qf: number[] = [];
  for (let i = 0; i < 4; i++) {
    qf.push(addKo("QF", "Viertelfinale", `Sieger Spiel ${r16[i * 2]}`, `Sieger Spiel ${r16[i * 2 + 1]}`));
  }

  // --- Halbfinale (2) ---
  const sf: number[] = [];
  for (let i = 0; i < 2; i++) {
    sf.push(addKo("SF", "Halbfinale", `Sieger Spiel ${qf[i * 2]}`, `Sieger Spiel ${qf[i * 2 + 1]}`));
  }

  // --- Spiel um Platz 3 ---
  addKo("TP", "Spiel um Platz 3", `Verlierer Spiel ${sf[0]}`, `Verlierer Spiel ${sf[1]}`);

  // --- Finale ---
  addKo("FINAL", "Finale", `Sieger Spiel ${sf[0]}`, `Sieger Spiel ${sf[1]}`);

  return matches;
}
