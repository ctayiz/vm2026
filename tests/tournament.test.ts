import { describe, it, expect } from "vitest";
import { reachedAtLeast, isBetFulfilled, scoreTournamentBet, betStatus } from "@/lib/tournament";
import { getQuestion, TOURNAMENT_QUESTIONS } from "@/lib/constants";

const champ = getQuestion("champion")!;
const finalQ = getQuestion("final")!;
const semiQ = getQuestion("semi")!;
const r16Q = getQuestion("r16")!;

describe("reachedAtLeast", () => {
  it("erkennt höhere Runden als erreicht", () => {
    expect(reachedAtLeast("SF", "R16")).toBe(true);
    expect(reachedAtLeast("FINAL", "FINAL")).toBe(true);
    expect(reachedAtLeast("R16", "R16")).toBe(true);
  });
  it("erkennt zu frühes Aus", () => {
    expect(reachedAtLeast("R16", "SF")).toBe(false);
    expect(reachedAtLeast("GROUP", "R32")).toBe(false);
  });
  it("null reachedPhase ist nie erfüllt", () => {
    expect(reachedAtLeast(null, "R32")).toBe(false);
  });
});

describe("scoreTournamentBet (Bonuspunkte)", () => {
  it("Weltmeister-Tipp: volle Punkte nur für den Champion", () => {
    expect(scoreTournamentBet(champ, { reachedPhase: "FINAL", isChampion: true })).toBe(champ.points);
    expect(scoreTournamentBet(champ, { reachedPhase: "FINAL", isChampion: false })).toBe(0);
  });

  it("Finalist-Tipp: Punkte ab Erreichen des Finales", () => {
    expect(scoreTournamentBet(finalQ, { reachedPhase: "FINAL", isChampion: false })).toBe(finalQ.points);
    expect(scoreTournamentBet(finalQ, { reachedPhase: "SF", isChampion: false })).toBe(0);
  });

  it("Halbfinale-Tipp: SF erreicht zählt, auch wenn dort raus", () => {
    expect(scoreTournamentBet(semiQ, { reachedPhase: "SF", isChampion: false })).toBe(semiQ.points);
    expect(scoreTournamentBet(semiQ, { reachedPhase: "QF", isChampion: false })).toBe(0);
  });

  it("Champion erfüllt auch tiefere Fragen (monoton)", () => {
    const team = { reachedPhase: "FINAL", isChampion: true };
    expect(isBetFulfilled(r16Q, team)).toBe(true);
    expect(isBetFulfilled(semiQ, team)).toBe(true);
    expect(isBetFulfilled(finalQ, team)).toBe(true);
  });

  it("noch offenes Team (null) gibt 0 Punkte", () => {
    expect(scoreTournamentBet(r16Q, { reachedPhase: null, isChampion: false })).toBe(0);
  });
});

describe("betStatus", () => {
  it("erfüllt, sobald Ziel erreicht", () => {
    expect(betStatus(r16Q, { reachedPhase: "QF", isChampion: false }, false)).toBe("fulfilled");
  });
  it("offen, solange Turnier läuft und Ziel nicht erreicht", () => {
    expect(betStatus(finalQ, { reachedPhase: null, isChampion: false }, false)).toBe("open");
  });
  it("verpasst erst nach Turnierende", () => {
    expect(betStatus(champ, { reachedPhase: "GROUP", isChampion: false }, true)).toBe("missed");
  });
});

describe("Fragen-Katalog", () => {
  it("hat eindeutige Schlüssel und positive Punkte", () => {
    const keys = new Set(TOURNAMENT_QUESTIONS.map((q) => q.key));
    expect(keys.size).toBe(TOURNAMENT_QUESTIONS.length);
    expect(TOURNAMENT_QUESTIONS.every((q) => q.points > 0)).toBe(true);
  });
});
