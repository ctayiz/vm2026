import { describe, it, expect } from "vitest";
import { pickLastAndNext } from "@/lib/favorites";

const now = new Date("2026-06-20T12:00:00Z");
const m = (iso: string, status: string) => ({ kickoff: new Date(iso), status });

describe("pickLastAndNext", () => {
  const matches = [
    m("2026-06-11T18:00:00Z", "finished"),
    m("2026-06-16T18:00:00Z", "finished"),
    m("2026-06-25T18:00:00Z", "scheduled"),
    m("2026-06-30T18:00:00Z", "scheduled"),
  ];

  it("wählt das jüngste abgeschlossene Spiel als 'last'", () => {
    const { last } = pickLastAndNext(matches, now);
    expect(last?.kickoff.toISOString()).toBe("2026-06-16T18:00:00.000Z");
  });

  it("wählt das nächste anstehende Spiel als 'next'", () => {
    const { next } = pickLastAndNext(matches, now);
    expect(next?.kickoff.toISOString()).toBe("2026-06-25T18:00:00.000Z");
  });

  it("liefert null, wenn keine passenden Spiele vorhanden sind", () => {
    expect(pickLastAndNext([], now)).toEqual({ last: null, next: null });
    const onlyPast = [m("2026-06-11T18:00:00Z", "finished")];
    expect(pickLastAndNext(onlyPast, now).next).toBeNull();
  });

  it("ignoriert vergangene, nicht abgeschlossene Spiele bei 'next'", () => {
    const weird = [m("2026-06-19T18:00:00Z", "scheduled")]; // in der Vergangenheit, nicht finished
    expect(pickLastAndNext(weird, now).next).toBeNull();
  });
});
