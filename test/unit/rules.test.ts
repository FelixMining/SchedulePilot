import { describe, expect, it } from "vitest";
import { buildFeed, previewEvents, summarizeCourses } from "../../src/shared/calendar";
import { getText, parseIcs } from "../../src/shared/ics";
import { applyRules, detectCode, detectType, renderTemplate, type Rule } from "../../src/shared/rules";
import { ade } from "../fixtures";

let nextId = 0;
function rule(partial: Partial<Rule> & Pick<Rule, "conditions" | "actions">): Rule {
  return { id: `r${nextId++}`, name: "", enabled: true, matchMode: "all", position: 0, ...partial };
}

const event = {
  summary: "HAI301I Algorithmique avancée TD",
  description: "L3 INFO GR A\nDUPONT Jean",
  location: "TD 36.105",
};

describe("detection", () => {
  it("finds the session type", () => {
    expect(detectType("HAI301I Algo TD")).toBe("TD");
    expect(detectType("Examen final")).toBe("Examen");
    expect(detectType("Rien", "cours magistral")).toBe("CM");
    expect(detectType("Mentorat")).toBe("");
  });

  it("finds course codes", () => {
    expect(detectCode("HAI301I Algorithmique")).toBe("HAI301I");
    expect(detectCode("HAI-302I BDD")).toBe("HAI302I");
    expect(detectCode("Mentorat L3")).toBe("");
  });
});

describe("renderTemplate", () => {
  it("replaces variables and tidies whitespace", () => {
    expect(renderTemplate("{a}  {missing} {b}", { a: "x", b: "y" })).toBe("x y");
  });
});

describe("applyRules", () => {
  it("renames with variables", () => {
    const r = applyRules(
      [
        rule({
          conditions: [{ field: "summary", operator: "contains", value: "hai301" }],
          actions: [{ type: "set_title", template: "Algo {type}" }],
        }),
      ],
      event,
    );
    expect(r.summary).toBe("Algo TD");
  });

  it("hides matching events", () => {
    const r = applyRules(
      [
        rule({
          conditions: [{ field: "summary", operator: "starts_with", value: "HAI" }],
          actions: [{ type: "hide" }],
        }),
      ],
      event,
    );
    expect(r.hidden).toBe(true);
  });

  it("exposes regex named groups", () => {
    const r = applyRules(
      [
        rule({
          conditions: [{ field: "location", operator: "regex", value: "(?<bat>\\d+)\\.(?<salle>\\d+)" }],
          actions: [{ type: "set_location", template: "Bât. {bat}, salle {salle}" }],
        }),
      ],
      event,
    );
    expect(r.location).toBe("Bât. 36, salle 105");
  });

  it("supports any/all matching and not_contains", () => {
    const any = rule({
      matchMode: "any",
      conditions: [
        { field: "summary", operator: "equals", value: "nope" },
        { field: "any", operator: "contains", value: "dupont" },
      ],
      actions: [{ type: "set_group", groupId: "g1" }],
    });
    const all = rule({
      conditions: [
        { field: "summary", operator: "contains", value: "algo" },
        { field: "description", operator: "not_contains", value: "GR B" },
      ],
      actions: [{ type: "set_description", template: "{type} avec groupe A" }],
    });
    const r = applyRules([any, all], event);
    expect(r.groupId).toBe("g1");
    expect(r.description).toBe("TD avec groupe A");
    expect(r.matchedRuleIds).toEqual([any.id, all.id]);
  });

  it("matches on the original event and lets later rules win", () => {
    const r = applyRules(
      [
        rule({ conditions: [], actions: [{ type: "set_title", template: "First" }] }),
        rule({
          conditions: [{ field: "summary", operator: "contains", value: "HAI301I" }],
          actions: [{ type: "set_title", template: "{title} / second" }],
        }),
      ],
      event,
    );
    expect(r.summary).toBe("First / second");
  });

  it("skips disabled rules", () => {
    const r = applyRules([rule({ enabled: false, conditions: [], actions: [{ type: "hide" }] })], event);
    expect(r.hidden).toBe(false);
  });
});

describe("buildFeed", () => {
  const rules = [
    rule({ conditions: [{ field: "summary", operator: "contains", value: "mentorat" }], actions: [{ type: "hide" }] }),
    rule({
      conditions: [{ field: "summary", operator: "regex", value: "\\bHAI[- ]?301I\\b" }],
      actions: [
        { type: "set_title", template: "Algorithmique · {type}" },
        { type: "set_group", groupId: "algo" },
      ],
    }),
    rule({ conditions: [], actions: [{ type: "set_description", template: "{type}\nSalle {location}" }] }),
  ];

  const summaries = (ics: string) =>
    parseIcs(ics)
      .components.filter((c) => c.name === "VEVENT")
      .map((c) => getText(c, "SUMMARY"));

  it("applies rules and drops hidden events", () => {
    const out = buildFeed(ade, rules, { name: "Fac", filter: { kind: "all" } });
    expect(summaries(out)).toEqual([
      "Algorithmique · TD",
      "Algorithmique · CM",
      "HAI-302I Bases de données TP",
      "Algorithmique · CM",
    ]);
    expect(out).toContain("X-WR-CALNAME:Fac");
    expect(out).toContain("DESCRIPTION:TD\\nSalle TD 36.105");
  });

  it("splits events per group", () => {
    const grouped = buildFeed(ade, rules, {
      name: "Algo",
      color: "#ff0000",
      filter: { kind: "group", groupId: "algo" },
    });
    expect(summaries(grouped)).toHaveLength(3);
    expect(grouped).toContain("X-APPLE-CALENDAR-COLOR:#ff0000");

    const rest = buildFeed(ade, rules, { name: "Autres", filter: { kind: "ungrouped" } });
    expect(summaries(rest)).toEqual(["HAI-302I Bases de données TP"]);
  });
});

describe("summaries", () => {
  it("groups courses by code", () => {
    const courses = summarizeCourses(ade, Date.parse("2026-01-01"));
    expect(courses.map((c) => [c.key, c.count])).toEqual([
      ["HAI301I", 3],
      ["HAI302I", 1],
      ["Mentorat L3", 1],
    ]);
    expect(courses[0]!.types.sort()).toEqual(["CM", "TD"]);
    expect(courses[0]!.nextStart).toBe("2099-01-05T07:00:00Z");
  });

  it("previews upcoming events only, in order", () => {
    const events = previewEvents(ade, [], { from: Date.parse("2026-01-01") });
    expect(events.map((e) => e.uid)).toEqual(["ADEevent-0001", "ADEevent-0002", "ADEevent-0003", "ADEevent-0004"]);
  });
});
