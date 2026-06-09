// Statische WM-Historie (Stammdaten) für die History-Seite.
// Quelle: offizielle FIFA-Turnierergebnisse 1930–2022.

export interface WorldCupEntry {
  year: number;
  host: string; // Gastgeber (Anzeigename)
  hostFlag: string; // ISO alpha-2 (lowercase)
  champion: string;
  championFlag: string;
  runnerUp: string;
  runnerUpFlag: string;
  finalScore: string; // Endspiel-Ergebnis (ggf. n.V. / n.E.)
  topScorer: string; // Torschützenkönig
  topScorerGoals: number;
}

// Neueste zuerst.
export const WORLD_CUPS: WorldCupEntry[] = [
  { year: 2022, host: "Katar", hostFlag: "qa", champion: "Argentinien", championFlag: "ar", runnerUp: "Frankreich", runnerUpFlag: "fr", finalScore: "3:3 n.E. (4:2)", topScorer: "Kylian Mbappé", topScorerGoals: 8 },
  { year: 2018, host: "Russland", hostFlag: "ru", champion: "Frankreich", championFlag: "fr", runnerUp: "Kroatien", runnerUpFlag: "hr", finalScore: "4:2", topScorer: "Harry Kane", topScorerGoals: 6 },
  { year: 2014, host: "Brasilien", hostFlag: "br", champion: "Deutschland", championFlag: "de", runnerUp: "Argentinien", runnerUpFlag: "ar", finalScore: "1:0 n.V.", topScorer: "James Rodríguez", topScorerGoals: 6 },
  { year: 2010, host: "Südafrika", hostFlag: "za", champion: "Spanien", championFlag: "es", runnerUp: "Niederlande", runnerUpFlag: "nl", finalScore: "1:0 n.V.", topScorer: "Th. Müller u. a.", topScorerGoals: 5 },
  { year: 2006, host: "Deutschland", hostFlag: "de", champion: "Italien", championFlag: "it", runnerUp: "Frankreich", runnerUpFlag: "fr", finalScore: "1:1 n.E. (5:3)", topScorer: "Miroslav Klose", topScorerGoals: 5 },
  { year: 2002, host: "Südkorea / Japan", hostFlag: "kr", champion: "Brasilien", championFlag: "br", runnerUp: "Deutschland", runnerUpFlag: "de", finalScore: "2:0", topScorer: "Ronaldo", topScorerGoals: 8 },
  { year: 1998, host: "Frankreich", hostFlag: "fr", champion: "Frankreich", championFlag: "fr", runnerUp: "Brasilien", runnerUpFlag: "br", finalScore: "3:0", topScorer: "Davor Šuker", topScorerGoals: 6 },
  { year: 1994, host: "USA", hostFlag: "us", champion: "Brasilien", championFlag: "br", runnerUp: "Italien", runnerUpFlag: "it", finalScore: "0:0 n.E. (3:2)", topScorer: "Salenko / Stoitschkow", topScorerGoals: 6 },
  { year: 1990, host: "Italien", hostFlag: "it", champion: "Deutschland", championFlag: "de", runnerUp: "Argentinien", runnerUpFlag: "ar", finalScore: "1:0", topScorer: "Salvatore Schillaci", topScorerGoals: 6 },
  { year: 1986, host: "Mexiko", hostFlag: "mx", champion: "Argentinien", championFlag: "ar", runnerUp: "Deutschland", runnerUpFlag: "de", finalScore: "3:2", topScorer: "Gary Lineker", topScorerGoals: 6 },
  { year: 1982, host: "Spanien", hostFlag: "es", champion: "Italien", championFlag: "it", runnerUp: "Deutschland", runnerUpFlag: "de", finalScore: "3:1", topScorer: "Paolo Rossi", topScorerGoals: 6 },
  { year: 1978, host: "Argentinien", hostFlag: "ar", champion: "Argentinien", championFlag: "ar", runnerUp: "Niederlande", runnerUpFlag: "nl", finalScore: "3:1 n.V.", topScorer: "Mario Kempes", topScorerGoals: 6 },
  { year: 1974, host: "Deutschland", hostFlag: "de", champion: "Deutschland", championFlag: "de", runnerUp: "Niederlande", runnerUpFlag: "nl", finalScore: "2:1", topScorer: "Grzegorz Lato", topScorerGoals: 7 },
  { year: 1970, host: "Mexiko", hostFlag: "mx", champion: "Brasilien", championFlag: "br", runnerUp: "Italien", runnerUpFlag: "it", finalScore: "4:1", topScorer: "Gerd Müller", topScorerGoals: 10 },
  { year: 1966, host: "England", hostFlag: "gb", champion: "England", championFlag: "gb", runnerUp: "Deutschland", runnerUpFlag: "de", finalScore: "4:2 n.V.", topScorer: "Eusébio", topScorerGoals: 9 },
  { year: 1962, host: "Chile", hostFlag: "cl", champion: "Brasilien", championFlag: "br", runnerUp: "Tschechoslowakei", runnerUpFlag: "cz", finalScore: "3:1", topScorer: "Garrincha u. a.", topScorerGoals: 4 },
  { year: 1958, host: "Schweden", hostFlag: "se", champion: "Brasilien", championFlag: "br", runnerUp: "Schweden", runnerUpFlag: "se", finalScore: "5:2", topScorer: "Just Fontaine", topScorerGoals: 13 },
  { year: 1954, host: "Schweiz", hostFlag: "ch", champion: "Deutschland", championFlag: "de", runnerUp: "Ungarn", runnerUpFlag: "hu", finalScore: "3:2", topScorer: "Sándor Kocsis", topScorerGoals: 11 },
  { year: 1950, host: "Brasilien", hostFlag: "br", champion: "Uruguay", championFlag: "uy", runnerUp: "Brasilien", runnerUpFlag: "br", finalScore: "2:1", topScorer: "Ademir", topScorerGoals: 8 },
  { year: 1938, host: "Frankreich", hostFlag: "fr", champion: "Italien", championFlag: "it", runnerUp: "Ungarn", runnerUpFlag: "hu", finalScore: "4:2", topScorer: "Leônidas", topScorerGoals: 7 },
  { year: 1934, host: "Italien", hostFlag: "it", champion: "Italien", championFlag: "it", runnerUp: "Tschechoslowakei", runnerUpFlag: "cz", finalScore: "2:1 n.V.", topScorer: "Oldřich Nejedlý", topScorerGoals: 5 },
  { year: 1930, host: "Uruguay", hostFlag: "uy", champion: "Uruguay", championFlag: "uy", runnerUp: "Argentinien", runnerUpFlag: "ar", finalScore: "4:2", topScorer: "Guillermo Stábile", topScorerGoals: 8 },
];

export interface TitleHolder {
  team: string;
  flag: string;
  titles: number;
  years: number[];
}

// Rekordweltmeister (nach Titeln, dann jüngster Titel zuerst).
export const TITLE_HOLDERS: TitleHolder[] = [
  { team: "Brasilien", flag: "br", titles: 5, years: [1958, 1962, 1970, 1994, 2002] },
  { team: "Deutschland", flag: "de", titles: 4, years: [1954, 1974, 1990, 2014] },
  { team: "Italien", flag: "it", titles: 4, years: [1934, 1938, 1982, 2006] },
  { team: "Argentinien", flag: "ar", titles: 3, years: [1978, 1986, 2022] },
  { team: "Frankreich", flag: "fr", titles: 2, years: [1998, 2018] },
  { team: "Uruguay", flag: "uy", titles: 2, years: [1930, 1950] },
  { team: "England", flag: "gb", titles: 1, years: [1966] },
  { team: "Spanien", flag: "es", titles: 1, years: [2010] },
];
