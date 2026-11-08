import { describe, expect, it } from "vitest";
import {
  escapeText,
  foldLine,
  getText,
  parseContentLine,
  parseIcs,
  serializeIcs,
  unescapeText,
  unfoldLines,
} from "../../src/shared/ics";
import { ade } from "../fixtures";

describe("unfoldLines", () => {
  it("joins continuation lines", () => {
    expect(unfoldLines("A:hello\r\n wor\r\n\tld\r\nB:x")).toEqual(["A:helloworld", "B:x"]);
  });
});

describe("parseContentLine", () => {
  it("parses params, including quoted values containing ':'", () => {
    const prop = parseContentLine('DTSTART;TZID="Europe/Paris:weird";VALUE=DATE-TIME:20260105T080000');
    expect(prop.name).toBe("DTSTART");
    expect(prop.params).toEqual([
      { name: "TZID", value: '"Europe/Paris:weird"' },
      { name: "VALUE", value: "DATE-TIME" },
    ]);
    expect(prop.value).toBe("20260105T080000");
  });

  it("keeps ':' inside the value", () => {
    expect(parseContentLine("URL:https://example.com/a").value).toBe("https://example.com/a");
  });
});

describe("text escaping", () => {
  it("round-trips", () => {
    const raw = "Salle 1, bât. A; étage 2\nback\\slash";
    expect(unescapeText(escapeText(raw))).toBe(raw);
  });
});

describe("foldLine", () => {
  it("folds at 75 octets without splitting multi-byte characters", () => {
    const line = "SUMMARY:" + "é".repeat(80);
    const folded = foldLine(line);
    const encoder = new TextEncoder();
    for (const part of folded.split("\r\n")) expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
    expect(unfoldLines(folded)[0]).toBe(line);
  });
});

describe("parseIcs", () => {
  it("reads an ADE export", () => {
    const cal = parseIcs(ade);
    const events = cal.components.filter((c) => c.name === "VEVENT");
    expect(events).toHaveLength(5);
    expect(getText(events[0]!, "DESCRIPTION")).toContain("(Exporté le:01/09/2026 10:00)");
  });

  it("survives a parse/serialize round-trip", () => {
    const once = serializeIcs(parseIcs(ade));
    expect(serializeIcs(parseIcs(once))).toBe(once);
  });

  it("rejects unbalanced components", () => {
    expect(() => parseIcs("BEGIN:VCALENDAR\nBEGIN:VEVENT\nEND:VCALENDAR")).toThrow();
  });
});
