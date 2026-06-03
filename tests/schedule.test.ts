import { describe, it, expect } from "vitest";
import { buildSchedule, TEAMS } from "@/lib/worldcup-data";
import { PHASES } from "@/lib/constants";

describe("WM-2026-Spielplan-Generator", () => {
  const schedule = buildSchedule();

  it("hat 48 Teams in 12 Gruppen", () => {
    expect(TEAMS).toHaveLength(48);
    const groups = new Set(TEAMS.map((t) => t.group));
    expect(groups.size).toBe(12);
  });

  it("erzeugt 104 Spiele (72 Gruppe + 32 K.o.)", () => {
    expect(schedule).toHaveLength(104);
    expect(schedule.filter((m) => m.phase === "GROUP")).toHaveLength(72);
  });

  it("deckt alle Turnierphasen ab – inkl. Runde der letzten 32", () => {
    const present = new Set(schedule.map((m) => m.phase));
    for (const p of PHASES) expect(present.has(p)).toBe(true);
    expect(schedule.filter((m) => m.phase === "R32")).toHaveLength(16);
    expect(schedule.filter((m) => m.phase === "FINAL")).toHaveLength(1);
    expect(schedule.filter((m) => m.phase === "TP")).toHaveLength(1);
  });

  it("vergibt eindeutige externe IDs", () => {
    const ids = new Set(schedule.map((m) => m.externalId));
    expect(ids.size).toBe(schedule.length);
  });

  it("Gruppenspiele haben echte Teams, K.o.-Spiele Platzhalter", () => {
    const group = schedule.find((m) => m.phase === "GROUP")!;
    expect(group.home?.code).toBeTruthy();
    const final = schedule.find((m) => m.phase === "FINAL")!;
    expect(final.homePlaceholder).toBeTruthy();
  });
});
