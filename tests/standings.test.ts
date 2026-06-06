import { describe, it, expect } from "vitest";
import { buildGroupTable, type StandTeam, type FinishedGroupMatch } from "@/lib/standings";

const A: StandTeam = { code: "AAA", name: "Alpha", flagCode: "aa" };
const B: StandTeam = { code: "BBB", name: "Bravo", flagCode: "bb" };
const C: StandTeam = { code: "CCC", name: "Charlie", flagCode: "cc" };
const D: StandTeam = { code: "DDD", name: "Delta", flagCode: "dd" };

function m(home: StandTeam, away: StandTeam, hg: number, ag: number): FinishedGroupMatch {
  return { home, away, homeGoals: hg, awayGoals: ag };
}

describe("buildGroupTable", () => {
  it("startet mit Nullwerten ohne Spiele", () => {
    const rows = buildGroupTable([A, B], []);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.played === 0 && r.points === 0 && r.gd === 0)).toBe(true);
    expect(rows.map((r) => r.rank)).toEqual([1, 2]);
  });

  it("vergibt 3 Punkte für Sieg, 1 für Remis", () => {
    const rows = buildGroupTable([A, B], [m(A, B, 2, 0)]);
    const a = rows.find((r) => r.code === "AAA")!;
    const b = rows.find((r) => r.code === "BBB")!;
    expect(a.points).toBe(3);
    expect(a.won).toBe(1);
    expect(a.gf).toBe(2);
    expect(a.ga).toBe(0);
    expect(a.gd).toBe(2);
    expect(b.points).toBe(0);
    expect(b.lost).toBe(1);
    expect(b.gd).toBe(-2);
  });

  it("zählt Remis korrekt", () => {
    const rows = buildGroupTable([A, B], [m(A, B, 1, 1)]);
    expect(rows.every((r) => r.points === 1 && r.drawn === 1)).toBe(true);
  });

  it("sortiert nach Punkten, dann Tordifferenz, dann Tore", () => {
    const matches = [
      m(A, B, 3, 0), // A +3
      m(C, D, 1, 0), // C +1
      m(A, C, 1, 1), // beide +1 punkt
      m(B, D, 5, 0), // B großer sieg
    ];
    const rows = buildGroupTable([A, B, C, D], matches);
    // A: 3+1=4 Pkt, B: 3 Pkt, C: 3+1=4 Pkt, D: 0
    // A und C je 4 Pkt -> Tordifferenz entscheidet (A: 4:1=+3, C: 2:2=0) -> A vor C
    expect(rows[0].code).toBe("AAA");
    expect(rows[0].points).toBe(4);
    expect(rows[0].rank).toBe(1);
    expect(rows[1].code).toBe("CCC");
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });

  it("ignoriert Spiele fremder Teams", () => {
    const X: StandTeam = { code: "XXX", name: "X", flagCode: null };
    const rows = buildGroupTable([A, B], [m(A, X, 1, 0)]);
    // X gehört nicht zur Gruppe -> Spiel wird ignoriert
    expect(rows.find((r) => r.code === "AAA")!.played).toBe(0);
  });
});
