import { describe, it, expect } from "vitest";
import { localizePlaceholder } from "@/lib/team-map";
import { dictionaries } from "@/lib/i18n";

const de = dictionaries.de.placeholder;
const tr = dictionaries.tr.placeholder;

describe("localizePlaceholder", () => {
  it("lokalisiert Gruppen-Plätze (DE & TR)", () => {
    expect(localizePlaceholder("1A", de)).toBe("Sieger Gruppe A");
    expect(localizePlaceholder("2B", de)).toBe("Zweiter Gruppe B");
    expect(localizePlaceholder("1A", tr)).toBe("A Grubu galibi");
    expect(localizePlaceholder("2B", tr)).toBe("B Grubu ikincisi");
  });
  it("lokalisiert Dritte, Sieger/Verlierer Spiel", () => {
    expect(localizePlaceholder("3A/B/C/D/F", de)).toBe("Dritter (Gruppe A/B/C/D/F)");
    expect(localizePlaceholder("W73", de)).toBe("Sieger Spiel 73");
    expect(localizePlaceholder("L101", de)).toBe("Verlierer Spiel 101");
    expect(localizePlaceholder("W73", tr)).toBe("73. maç galibi");
    expect(localizePlaceholder("3A/B/C/D/F", tr)).toBe("Grup üçüncüsü (A/B/C/D/F)");
  });
  it("null/unbekannt -> null bzw. Token unverändert", () => {
    expect(localizePlaceholder(null, de)).toBeNull();
    expect(localizePlaceholder("", de)).toBeNull();
    expect(localizePlaceholder("Foobar", de)).toBe("Foobar");
  });
});
