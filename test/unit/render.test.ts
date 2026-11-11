import { describe, expect, it } from "vitest";
import { buildFeed, readEvents } from "../../src/shared/calendar";
import { getProperty, getText, parseIcs } from "../../src/shared/ics";
import { listFeeds, matchesKeyword, renderEvent, renderTemplate } from "../../src/shared/render";
import { DEFAULT_SETTINGS, resolveSettings, type Settings } from "../../src/shared/settings";
import { ade } from "../fixtures";

const events = readEvents(ade);
const byUid = (uid: string) => events.find((e) => e.uid === uid)!;
const settings = (patch: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...patch });

describe("matchesKeyword", () => {
  it("matches whole words, ignoring case and accents", () => {
    expect(matchesKeyword("HAI105X Examen", ["examen"])).toBe(true);
    expect(matchesKeyword("Controle continu", ["contrôle"])).toBe(true);
    expect(matchesKeyword("CC2 algo", ["CC"])).toBe(false);
    expect(matchesKeyword("Algo - CC", ["cc"])).toBe(true);
    expect(matchesKeyword("Examens", ["examen"])).toBe(false);
  });
});

describe("renderEvent", () => {
  it("builds a clean title, location and description", () => {
    const r = renderEvent(byUid("ADEevent-0002"), settings());
    expect(r.title).toBe("Algorithmique 1 · TD");
    expect(r.location).toBe("Salle 5.202 · Claire Martin");
    expect(renderEvent(byUid("ADEevent-0002"), settings({ location: { teachers: false } })).location).toBe(
      "Salle 5.202",
    );
    expect(r.description).toBe("TD · Salle 5.202\nClaire Martin\nHAI101I");
  });

  it("uses the custom course name and color", () => {
    const s = settings({ courses: { HAI101I: { name: "Algo", color: "#123456" } } });
    const r = renderEvent(byUid("ADEevent-0001"), s);
    expect(r.title).toBe("Algo · CM");
    expect(r.color).toBe("#123456");
    expect(r.feed).toBe("hai101i");
    expect(r.description).toBe("Cours magistral · Amphi 5.01\nJean Dupont\nAlgorithmique 1 · HAI101I");
  });

  it("detects and highlights exams", () => {
    const r = renderEvent(byUid("ADEevent-0004"), settings());
    expect(r).toMatchObject({
      exam: true,
      type: "Examen",
      feed: "examens",
      title: "EXAMEN · Bases des mathématiques pour l'informatique",
    });
  });

  it("hides courses and keywords", () => {
    expect(renderEvent(byUid("ADEevent-0005"), settings({ hideKeywords: ["mentorat"] })).hidden).toBe(true);
    expect(renderEvent(byUid("ADEevent-0002"), settings({ courses: { HAI101I: { hidden: true } } })).hidden).toBe(true);
  });

  it("follows the title and description options", () => {
    const s = settings({
      title: { ...DEFAULT_SETTINGS.title, typePosition: "before", highlightExams: false },
      description: { type: false, rooms: false, teachers: false, course: false, groups: true },
    });
    const r = renderEvent(byUid("ADEevent-0003"), s);
    expect(r.title).toBe("TP · Algorithmique 1");
    expect(r.description).toBe("Groupes : INFO GR C");
    expect(renderEvent(byUid("ADEevent-0004"), s).title).toBe("Examen · Bases des mathématiques pour l'informatique");
  });
});

describe("custom titles", () => {
  const custom = (template: string, highlightExams = true) =>
    settings({ title: { typePosition: "custom", template, highlightExams } });

  it("puts the room first", () => {
    expect(renderEvent(byUid("ADEevent-0002"), custom("{num_salle} · {matiere} {type}")).title).toBe(
      "5.202 · Algorithmique 1 TD",
    );
    expect(renderEvent(byUid("ADEevent-0003"), custom("{num_salle} · {matiere}")).title).toBe(
      "36.204 · Algorithmique 1",
    );
    expect(renderEvent(byUid("ADEevent-0006"), custom("{salle} · {prof}")).title).toBe(
      "Amphi 5.06, Amphi 5.01 · Anne-Marie De La Fontaine",
    );
  });

  it("drops separators around missing values", () => {
    expect(renderEvent(byUid("ADEevent-0007"), custom("{num_salle} · {matiere} {type}")).title).toBe("SPORT");
    expect(renderEvent(byUid("ADEevent-0002"), custom("{code} - {titre_original}")).title).toBe(
      "HAI101I - HAI101I Portail Info GrC",
    );
  });

  it("keeps highlighting exams and falls back on the name", () => {
    expect(renderEvent(byUid("ADEevent-0004"), custom("{num_salle} · {matiere} {type}")).title).toBe(
      "EXAMEN · 5.06 · Bases des mathématiques pour l'informatique",
    );
    expect(renderEvent(byUid("ADEevent-0004"), custom("{num_salle} · {matiere} {type}", false)).title).toBe(
      "5.06 · Bases des mathématiques pour l'informatique Examen",
    );
    expect(renderEvent(byUid("ADEevent-0002"), custom("{inconnu}")).title).toBe("Algorithmique 1");
  });
});

describe("renderTemplate", () => {
  it("cleans up dangling separators and brackets", () => {
    const vars = { a: "A", b: "", c: "C" };
    expect(renderTemplate("{b} · {a}", vars)).toBe("A");
    expect(renderTemplate("{a} · {b} · {c}", vars)).toBe("A · C");
    expect(renderTemplate("{a} - {b}", vars)).toBe("A");
    expect(renderTemplate("[{b}] {a}", vars)).toBe("A");
    expect(renderTemplate("{a}-{c}", vars)).toBe("A-C");
  });
});

describe("hidden events", () => {
  it("hides a single occurrence", () => {
    const s = settings({ hiddenEvents: ["ADEevent-0002"] });
    expect(renderEvent(byUid("ADEevent-0002"), s)).toMatchObject({ hidden: true, hiddenReason: "event" });
    expect(renderEvent(byUid("ADEevent-0003"), s).hidden).toBe(false);
    expect(buildFeed(ade, s, { name: "Fac", feed: null })).not.toContain("ADEevent-0002");
  });

  it("uses the start time when a UID is shared", () => {
    const twice = ade.replace("UID:ADEevent-0003", "UID:ADEevent-0002");
    const ids = readEvents(twice).map((e) => e.id);
    expect(ids).toContain("ADEevent-0002|2099-01-06T07:45:00Z");
    expect(ids).toContain("ADEevent-0002|2099-01-07T07:45:00Z");
    expect(ids).toContain("ADEevent-0001");
  });
});

describe("listFeeds", () => {
  it("creates one calendar per course plus exams", () => {
    const feeds = listFeeds(events, settings({ hideKeywords: ["mentorat"] }));
    expect(feeds.map((f) => f.name)).toEqual(["Algorithmique 1", "Programmation fonctionnelle", "Autres", "Examens"]);
  });

  it("gives one-off events their own calendar only when they have a color", () => {
    const feeds = listFeeds(events, settings({ courses: { SPORT: { color: "#000000" } } }));
    expect(feeds.map((f) => f.key)).toContain("sport");
    expect(feeds.find((f) => f.key === "autres")?.name).toBe("Autres");
  });

  it("creates one calendar per session type", () => {
    const feeds = listFeeds(events, settings({ colorMode: "type" }));
    expect(feeds.map((f) => f.key)).toEqual(["autre", "cm", "td", "tp", "examens"]);
  });

  it("creates a single calendar", () => {
    expect(listFeeds(events, settings({ colorMode: "single", examsSeparate: false })).map((f) => f.key)).toEqual([
      "cours",
    ]);
  });
});

describe("buildFeed", () => {
  const summaries = (ics: string) =>
    parseIcs(ics)
      .components.filter((c) => c.name === "VEVENT")
      .map((c) => getText(c, "SUMMARY"));

  it("filters one calendar and adds exam reminders", () => {
    const s = settings();
    expect(summaries(buildFeed(ade, s, { name: "Algo", feed: "hai101i" }))).toEqual([
      "Algorithmique 1 · CM",
      "Algorithmique 1 · TD",
      "Algorithmique 1 · TP",
    ]);
    const exams = buildFeed(ade, s, { name: "Examens", color: "#ef4444", feed: "examens" });
    expect(exams).toContain("BEGIN:VALARM");
    expect(exams).toContain("TRIGGER:-P1D");
    expect(exams).toContain("X-APPLE-CALENDAR-COLOR:#EF4444");
  });

  it("writes times in the chosen time zone", () => {
    const ics = buildFeed(ade, settings(), { name: "Fac", feed: null });
    const cal = parseIcs(ics);
    const first = cal.components.find((c) => c.name === "VEVENT")!;
    expect(getProperty(first, "DTSTART")).toEqual({
      name: "DTSTART",
      params: [{ name: "TZID", value: "Europe/Paris" }],
      value: "20990105T080000",
    });
    expect(ics).toContain("X-WR-TIMEZONE:Europe/Paris");
    expect(ics).not.toMatch(/DTSTART:\d{8}T\d{6}Z/);

    const summer = buildFeed(ade, settings({ timeZone: "America/Guadeloupe" }), { name: "Fac", feed: null });
    expect(summer).toContain("DTSTART;TZID=America/Guadeloupe:20990105T030000");
  });

  it("keeps everything visible in the full feed", () => {
    const all = buildFeed(ade, settings({ hideKeywords: ["sport"] }), { name: "Fac", feed: null });
    expect(summaries(all)).toHaveLength(6);
    expect(all).toContain("X-WR-CALNAME:Fac");
    expect(all).not.toContain("Exported");
  });
});

describe("resolveSettings", () => {
  it("fills missing fields from defaults", () => {
    const s = resolveSettings({ colorMode: "type", title: { typePosition: "none" }, courses: { A: { hidden: true } } });
    expect(s.colorMode).toBe("type");
    expect(s.title).toEqual({ ...DEFAULT_SETTINGS.title, typePosition: "none" });
    expect(s.examKeywords).toEqual(DEFAULT_SETTINGS.examKeywords);
    expect(s.courses).toEqual({ A: { hidden: true } });
    expect(resolveSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});
