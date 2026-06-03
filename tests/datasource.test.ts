import { describe, it, expect } from "vitest";
import { normalizeOpenFootball } from "@/lib/datasource";

// Fixture im echten OpenFootball-WM-2026-Format (flaches matches-Array).
const fixture = {
  name: "World Cup 2026",
  matches: [
    {
      round: "Matchday 1",
      date: "2026-06-11",
      time: "13:00 UTC-6",
      team1: "Mexico",
      team2: "South Africa",
      group: "Group A",
      ground: "Mexico City",
    },
    {
      round: "Round of 32",
      num: 73,
      date: "2026-06-28",
      time: "12:00 UTC-7",
      team1: "2A",
      team2: "2B",
      ground: "Los Angeles (Inglewood)",
    },
    {
      round: "Final",
      num: 104,
      date: "2026-07-19",
      time: "15:00 UTC-4",
      team1: "W101",
      team2: "W102",
      ground: "New York New Jersey",
    },
    {
      // bereits gespieltes Spiel mit Ergebnis
      round: "Matchday 1",
      date: "2026-06-11",
      time: "20:00 UTC-6",
      team1: "Germany",
      team2: "Brazil",
      group: "Group B",
      ground: "Dallas",
      score: { ft: [2, 1] },
    },
  ],
};

describe("normalizeOpenFootball (echtes WM-2026-Format)", () => {
  const out = normalizeOpenFootball(fixture);

  it("normalisiert alle Spiele", () => {
    expect(out).toHaveLength(4);
  });

  it("löst echte Teams auf deutschen Namen + Flagge auf", () => {
    const opener = out[0];
    expect(opener.home).toEqual({ code: "MEX", name: "Mexiko", flagCode: "mx" });
    expect(opener.away).toEqual({ code: "RSA", name: "Südafrika", flagCode: "za" });
    expect(opener.group).toBe("A");
    expect(opener.phase).toBe("GROUP");
    expect(opener.roundLabel).toBe("Gruppe A");
  });

  it("rechnet Anstoßzeit mit UTC-Offset korrekt um (13:00 UTC-6 → 19:00 UTC)", () => {
    expect(out[0].kickoff).toBe("2026-06-11T19:00:00.000Z");
  });

  it("übersetzt K.o.-Platzhalter ins Deutsche", () => {
    expect(out[1].phase).toBe("R32");
    expect(out[1].homePlaceholder).toBe("Zweiter Gruppe A");
    expect(out[1].awayPlaceholder).toBe("Zweiter Gruppe B");
    expect(out[1].home).toBeUndefined();

    expect(out[2].phase).toBe("FINAL");
    expect(out[2].homePlaceholder).toBe("Sieger Spiel 101");
  });

  it("vergibt stabile externalIds (num bzw. Gruppe+Teams)", () => {
    expect(out[1].externalId).toBe("wc2026-73");
    expect(out[0].externalId).toBe("wc2026-g-A-mexico-south-africa");
  });

  it("übernimmt Ergebnisse als finished", () => {
    const ger = out[3];
    expect(ger.status).toBe("finished");
    expect(ger.homeGoals).toBe(2);
    expect(ger.awayGoals).toBe(1);
  });
});
