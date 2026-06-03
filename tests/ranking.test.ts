import { describe, it, expect } from "vitest";
import { buildLeaderboard, compareUsers, type UserScoreInput } from "@/lib/ranking";

function mk(partial: Partial<UserScoreInput> & { userId: string }): UserScoreInput {
  return {
    displayName: partial.userId,
    avatarUrl: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    totalPoints: 0,
    correctCount: 0,
    scoredCount: 0,
    predictedCount: 0,
    recentPoints: [],
    ...partial,
  };
}

describe("Ranking-Sortierung", () => {
  it("sortiert primär nach Gesamtpunkten (absteigend)", () => {
    const board = buildLeaderboard([
      mk({ userId: "low", totalPoints: 3 }),
      mk({ userId: "high", totalPoints: 9 }),
      mk({ userId: "mid", totalPoints: 6 }),
    ]);
    expect(board.map((r) => r.userId)).toEqual(["high", "mid", "low"]);
    expect(board.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("Tiebreaker 1: mehr richtige Tipps bei Punktgleichheit", () => {
    const board = buildLeaderboard([
      mk({ userId: "fewer", totalPoints: 9, correctCount: 3, scoredCount: 5 }),
      mk({ userId: "more", totalPoints: 9, correctCount: 4, scoredCount: 6 }),
    ]);
    expect(board[0].userId).toBe("more");
  });

  it("Tiebreaker 2: bessere Trefferquote bei gleichen Punkten & richtigen", () => {
    const board = buildLeaderboard([
      mk({ userId: "schlechter", totalPoints: 9, correctCount: 3, scoredCount: 10 }),
      mk({ userId: "besser", totalPoints: 9, correctCount: 3, scoredCount: 4 }),
    ]);
    expect(board[0].userId).toBe("besser");
  });

  it("Tiebreaker 3: früher registriert gewinnt", () => {
    const board = buildLeaderboard([
      mk({ userId: "spaet", totalPoints: 9, correctCount: 3, scoredCount: 4, createdAt: new Date("2026-02-01") }),
      mk({ userId: "frueh", totalPoints: 9, correctCount: 3, scoredCount: 4, createdAt: new Date("2026-01-01") }),
    ]);
    expect(board[0].userId).toBe("frueh");
  });

  it("Tiebreaker 4: alphabetisch bei sonst identischen Werten", () => {
    const same = { totalPoints: 9, correctCount: 3, scoredCount: 4, createdAt: new Date("2026-01-01") };
    const board = buildLeaderboard([
      mk({ userId: "z", displayName: "Zoe", ...same }),
      mk({ userId: "a", displayName: "Anna", ...same }),
    ]);
    expect(board.map((r) => r.displayName)).toEqual(["Anna", "Zoe"]);
  });

  it("vergibt gleichen Rang bei vollständiger Gleichheit (Competition Ranking)", () => {
    const same = { totalPoints: 9, correctCount: 3, scoredCount: 4, createdAt: new Date("2026-01-01") };
    const board = buildLeaderboard([
      mk({ userId: "a", displayName: "Anna", ...same }),
      mk({ userId: "b", displayName: "Anna", ...same }),
      mk({ userId: "c", totalPoints: 3 }),
    ]);
    expect(board[0].rank).toBe(1);
    expect(board[1].rank).toBe(1);
    expect(board[2].rank).toBe(3); // Sprung nach Gleichstand
  });

  it("Trefferquote: 0 ohne gewertete Tipps", () => {
    const board = buildLeaderboard([mk({ userId: "neu" })]);
    expect(board[0].accuracy).toBe(0);
  });

  it("compareUsers ist konsistent (Punkte schlagen alles)", () => {
    const a = mk({ userId: "a", totalPoints: 10, correctCount: 0 });
    const b = mk({ userId: "b", totalPoints: 9, correctCount: 100 });
    expect(compareUsers(a, b)).toBeLessThan(0);
  });
});
