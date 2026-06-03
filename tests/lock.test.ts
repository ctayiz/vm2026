import { describe, it, expect } from "vitest";
import { getLockTime, isPickLocked, msUntilLock } from "@/lib/lock";

const kickoff = new Date("2026-06-11T18:00:00Z");

describe("Tipp-Lock (15 Minuten vor Spielbeginn)", () => {
  it("Lock-Zeit liegt exakt 15 Minuten vor Anpfiff", () => {
    expect(getLockTime(kickoff).toISOString()).toBe("2026-06-11T17:45:00.000Z");
  });

  it("ist NICHT gesperrt, deutlich vor Tipp-Schluss", () => {
    expect(isPickLocked(kickoff, new Date("2026-06-11T17:00:00Z"))).toBe(false);
  });

  it("ist NICHT gesperrt, eine Minute vor Tipp-Schluss (16 Min vor Anpfiff)", () => {
    expect(isPickLocked(kickoff, new Date("2026-06-11T17:44:00Z"))).toBe(false);
  });

  it("ist gesperrt, exakt zum Tipp-Schluss (15 Min vor Anpfiff)", () => {
    expect(isPickLocked(kickoff, new Date("2026-06-11T17:45:00Z"))).toBe(true);
  });

  it("ist gesperrt, nach Anpfiff", () => {
    expect(isPickLocked(kickoff, new Date("2026-06-11T18:30:00Z"))).toBe(true);
  });

  it("msUntilLock zählt korrekt herunter und wird nie negativ", () => {
    expect(msUntilLock(kickoff, new Date("2026-06-11T17:44:00Z"))).toBe(60_000);
    expect(msUntilLock(kickoff, new Date("2026-06-11T17:45:00Z"))).toBe(0);
    expect(msUntilLock(kickoff, new Date("2026-06-11T19:00:00Z"))).toBe(0);
  });
});

describe("Tipp erstellen / ändern – Regel über den Lock erzwungen", () => {
  // Diese Regel wird in submitPredictionAction serverseitig angewandt:
  //   if (isPickLocked(match.kickoff)) -> ablehnen
  const canSubmit = (now: Date) => !isPickLocked(kickoff, now);

  it("Tipp erstellen ist erlaubt, solange nicht gesperrt", () => {
    expect(canSubmit(new Date("2026-06-11T12:00:00Z"))).toBe(true);
  });

  it("Tipp ändern vor Lock ist erlaubt", () => {
    expect(canSubmit(new Date("2026-06-11T17:44:59Z"))).toBe(true);
  });

  it("Tipp ändern nach Lock wird verhindert", () => {
    expect(canSubmit(new Date("2026-06-11T17:46:00Z"))).toBe(false);
  });
});
