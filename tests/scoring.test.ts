import { describe, it, expect } from "vitest";
import { outcomeFromGoals, scorePrediction, isCorrect } from "@/lib/scoring";

describe("outcomeFromGoals", () => {
  it("Heimsieg", () => expect(outcomeFromGoals(2, 1)).toBe("HOME_WIN"));
  it("Auswärtssieg", () => expect(outcomeFromGoals(0, 3)).toBe("AWAY_WIN"));
  it("Unentschieden", () => expect(outcomeFromGoals(1, 1)).toBe("DRAW"));
  it("0:0 ist Unentschieden", () => expect(outcomeFromGoals(0, 0)).toBe("DRAW"));
});

describe("scorePrediction (1X2): 3 Punkte richtig, sonst 0", () => {
  it("richtiger Heimsieg → 3", () => expect(scorePrediction("HOME_WIN", 2, 0)).toBe(3));
  it("richtiges Unentschieden → 3", () => expect(scorePrediction("DRAW", 1, 1)).toBe(3));
  it("richtiger Auswärtssieg → 3", () => expect(scorePrediction("AWAY_WIN", 0, 2)).toBe(3));

  it("falscher Tipp → 0", () => expect(scorePrediction("HOME_WIN", 0, 2)).toBe(0));
  it("Unentschieden getippt, war Sieg → 0", () => expect(scorePrediction("DRAW", 3, 1)).toBe(0));

  it("Joker-Multiplikator verdoppelt (Erweiterbarkeit)", () => {
    expect(scorePrediction("HOME_WIN", 2, 0, { jokerMultiplier: 2 })).toBe(6);
    expect(scorePrediction("HOME_WIN", 0, 2, { jokerMultiplier: 2 })).toBe(0);
  });
});

describe("Admin-Ergebnisupdate führt zu korrekter Auswertung", () => {
  // Simuliert das, was rescoreMatch nach setResultAction tut.
  const predictions = [
    { user: "A", pick: "HOME_WIN" as const },
    { user: "B", pick: "DRAW" as const },
    { user: "C", pick: "AWAY_WIN" as const },
  ];
  it("Ergebnis 2:1 → nur Heimsieg-Tipp bekommt 3 Punkte", () => {
    const points = predictions.map((p) => scorePrediction(p.pick, 2, 1));
    expect(points).toEqual([3, 0, 0]);
  });
  it("Korrektur auf 1:1 → nur Unentschieden-Tipp bekommt 3 Punkte", () => {
    const points = predictions.map((p) => scorePrediction(p.pick, 1, 1));
    expect(points).toEqual([0, 3, 0]);
  });
  it("isCorrect stimmt mit Punktevergabe überein", () => {
    expect(isCorrect("AWAY_WIN", 0, 4)).toBe(true);
    expect(isCorrect("AWAY_WIN", 4, 0)).toBe(false);
  });
});

import { outcomeOf } from "@/lib/scoring";

describe("outcomeOf (K.-o.-Sieger hat Vorrang vor Toren)", () => {
  it("ohne Sieger = normaler 1X2-Ausgang", () => {
    expect(outcomeOf(1, 1, null)).toBe("DRAW");
    expect(outcomeOf(2, 0, null)).toBe("HOME_WIN");
  });
  it("Sieger nach Elfmeter trotz Tor-Gleichstand", () => {
    expect(outcomeOf(1, 1, "AWAY")).toBe("AWAY_WIN");
    expect(outcomeOf(1, 1, "HOME")).toBe("HOME_WIN");
  });
  it("Tipp auf Sieger zählt, nicht auf Unentschieden", () => {
    // 1:1, Heim gewinnt im Elfmeterschießen
    expect(scorePrediction("HOME_WIN", 1, 1, { winner: "HOME" })).toBe(3);
    expect(scorePrediction("DRAW", 1, 1, { winner: "HOME" })).toBe(0);
    expect(scorePrediction("AWAY_WIN", 1, 1, { winner: "HOME" })).toBe(0);
  });
  it("isCorrect mit Sieger", () => {
    expect(isCorrect("AWAY_WIN", 2, 2, { winner: "AWAY" })).toBe(true);
    expect(isCorrect("DRAW", 2, 2, { winner: "AWAY" })).toBe(false);
  });
});
