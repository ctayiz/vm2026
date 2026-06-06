// Die 16 Austragungsorte der FIFA WM 2026 in den USA, Kanada und Mexiko.
// Reine Stammdaten (statisch) – die kostenlose Datenquelle liefert keine Stadien.

export interface Venue {
  city: string; // Anzeige-Stadt
  stadium: string; // (WM-)Stadionname
  country: "USA" | "Kanada" | "Mexiko";
  flagCode: string; // ISO alpha-2 für Flagge
  capacity: number; // ungefähre Kapazität
}

export const HOST_COUNTRIES: { name: Venue["country"]; flagCode: string }[] = [
  { name: "USA", flagCode: "us" },
  { name: "Kanada", flagCode: "ca" },
  { name: "Mexiko", flagCode: "mx" },
];

export const VENUES: Venue[] = [
  // USA (11)
  { city: "New York / New Jersey", stadium: "MetLife Stadium", country: "USA", flagCode: "us", capacity: 82500 },
  { city: "Los Angeles", stadium: "SoFi Stadium", country: "USA", flagCode: "us", capacity: 70000 },
  { city: "Dallas", stadium: "AT&T Stadium", country: "USA", flagCode: "us", capacity: 80000 },
  { city: "San Francisco Bay Area", stadium: "Levi's Stadium", country: "USA", flagCode: "us", capacity: 68500 },
  { city: "Miami", stadium: "Hard Rock Stadium", country: "USA", flagCode: "us", capacity: 65300 },
  { city: "Atlanta", stadium: "Mercedes-Benz Stadium", country: "USA", flagCode: "us", capacity: 71000 },
  { city: "Seattle", stadium: "Lumen Field", country: "USA", flagCode: "us", capacity: 69000 },
  { city: "Houston", stadium: "NRG Stadium", country: "USA", flagCode: "us", capacity: 72200 },
  { city: "Philadelphia", stadium: "Lincoln Financial Field", country: "USA", flagCode: "us", capacity: 69300 },
  { city: "Kansas City", stadium: "Arrowhead Stadium", country: "USA", flagCode: "us", capacity: 76400 },
  { city: "Boston", stadium: "Gillette Stadium", country: "USA", flagCode: "us", capacity: 65900 },
  // Kanada (2)
  { city: "Toronto", stadium: "BMO Field", country: "Kanada", flagCode: "ca", capacity: 45700 },
  { city: "Vancouver", stadium: "BC Place", country: "Kanada", flagCode: "ca", capacity: 54500 },
  // Mexiko (3)
  { city: "Mexiko-Stadt", stadium: "Estadio Azteca", country: "Mexiko", flagCode: "mx", capacity: 87500 },
  { city: "Guadalajara", stadium: "Estadio Akron", country: "Mexiko", flagCode: "mx", capacity: 48000 },
  { city: "Monterrey", stadium: "Estadio BBVA", country: "Mexiko", flagCode: "mx", capacity: 53500 },
];
