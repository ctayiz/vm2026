// Feste Stadion-/Stadt-Zuordnung pro Spiel (offizieller FIFA-Spielplan WM 2026).
//
// Hintergrund: Weder football-data.org noch API-Football liefern im Gratis-Tarif
// das Stadion pro Spiel. Diese Zuordnung wurde einmalig aus dem offiziellen
// Spielplan (openfootball/worldcup) erzeugt und über die football-data-externalId
// verknüpft (Gruppenphase per Team-Paar, K.o. per exaktem Anpfiff). Siehe
// match-venues.json (104 Einträge).

import venues from "./match-venues.json";

export type VenueInfo = { stadium: string; city: string };

const MATCH_VENUES = venues as Record<string, VenueInfo>;

/** Stadion/Stadt für ein Spiel (per externalId), oder null wenn unbekannt. */
export function venueFor(externalId: string): VenueInfo | null {
  return MATCH_VENUES[externalId] ?? null;
}
