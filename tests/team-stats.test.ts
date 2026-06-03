import { describe, it, expect } from "vitest";
import { buildTeamStats, type TeamRef, type FinishedMatch } from "@/lib/team-stats";

const teams: TeamRef[] = [
  { id: "a", name: "Alpha", code: "ALP", flagCode: "de", group: "A" },
  { id: "b", name: "Beta", code: "BET", flagCode: "br", group: "A" },
  { id: "c", name: "Gamma", code: "GAM", flagCode: "fr", group: "A" },
];

describe("buildTeamStats", () => {
  const matches: FinishedMatch[] = [
    { homeTeamId: "a", awayTeamId: "b", homeGoals: 2, awayGoals: 0 }, // A gewinnt
    { homeTeamId: "b", awayTeamId: "c", homeGoals: 1, awayGoals: 1 }, // remis
    { homeTeamId: "a", awayTeamId: "c", homeGoals: 1, awayGoals: 3 }, // C gewinnt
  ];
  const rows = buildTeamStats(teams, matches);

  it("listet nur Teams mit Spielen", () => {
    expect(rows).toHaveLength(3);
  });

  it("berechnet Punkte korrekt (3/1/0)", () => {
    const a = rows.find((r) => r.id === "a")!;
    expect(a.played).toBe(2);
    expect(a.won).toBe(1);
    expect(a.lost).toBe(1);
    expect(a.points).toBe(3);
    expect(a.goalsFor).toBe(3);
    expect(a.goalsAgainst).toBe(3);
    expect(a.goalDiff).toBe(0);
  });

  it("zählt Tore beider Seiten", () => {
    const c = rows.find((r) => r.id === "c")!;
    expect(c.goalsFor).toBe(4); // 1 + 3
    expect(c.goalsAgainst).toBe(2); // 1 + 1
    expect(c.points).toBe(4); // Sieg + Remis
  });

  it("sortiert nach Punkten, dann Tordifferenz", () => {
    // C: 4 Pkt, A: 3 Pkt, B: 1 Pkt
    expect(rows.map((r) => r.id)).toEqual(["c", "a", "b"]);
  });

  it("erfasst Form (jüngste zuerst, max 5)", () => {
    const a = rows.find((r) => r.id === "a")!;
    // A: Sieg (Spiel 1), dann Niederlage (Spiel 3) -> jüngste zuerst: L, W
    expect(a.form).toEqual(["L", "W"]);
  });

  it("ignoriert Platzhalter-Spiele ohne Team-IDs", () => {
    const r = buildTeamStats(teams, [{ homeTeamId: null, awayTeamId: null, homeGoals: 1, awayGoals: 0 }]);
    expect(r).toHaveLength(0);
  });
});
