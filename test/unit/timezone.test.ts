import { describe, expect, it } from "vitest";
import { getText, serializeComponent } from "../../src/shared/ics";
import { buildVTimezone, isValidTimeZone, localizeEvent, utcToLocal } from "../../src/shared/timezone";

describe("utcToLocal", () => {
  it("handles daylight saving time", () => {
    expect(utcToLocal("20261109T084500Z", "Europe/Paris")).toBe("20261109T094500");
    expect(utcToLocal("20260615T084500Z", "Europe/Paris")).toBe("20260615T104500");
    expect(utcToLocal("20261109T084500Z", "Indian/Reunion")).toBe("20261109T124500");
  });

  it("ignores floating and date-only values", () => {
    expect(utcToLocal("20261109T084500", "Europe/Paris")).toBeNull();
    expect(utcToLocal("20261109", "Europe/Paris")).toBeNull();
  });
});

describe("buildVTimezone", () => {
  it("describes European rules", () => {
    const lines = serializeComponent(buildVTimezone("Europe/Paris")!);
    expect(lines).toEqual([
      "BEGIN:VTIMEZONE",
      "TZID:Europe/Paris",
      "BEGIN:DAYLIGHT",
      "TZOFFSETFROM:+0100",
      "TZOFFSETTO:+0200",
      "DTSTART:19700329T020000",
      "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
      "END:DAYLIGHT",
      "BEGIN:STANDARD",
      "TZOFFSETFROM:+0200",
      "TZOFFSETTO:+0100",
      "DTSTART:19701025T030000",
      "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
      "END:STANDARD",
      "END:VTIMEZONE",
    ]);
  });

  it("uses a fixed offset when there is no daylight saving time", () => {
    const tz = buildVTimezone("Pacific/Noumea")!;
    expect(tz.components).toHaveLength(1);
    expect(getText(tz.components[0]!, "TZOFFSETTO")).toBe("+1100");
  });
});

describe("localizeEvent", () => {
  it("rewrites UTC dates and leaves the others alone", () => {
    const event = {
      name: "VEVENT",
      components: [],
      properties: [
        { name: "DTSTART", params: [], value: "20261109T084500Z" },
        { name: "DTEND", params: [{ name: "TZID", value: "Europe/London" }], value: "20261109T100000" },
        { name: "DTSTAMP", params: [], value: "20261108T165235Z" },
      ],
    };
    localizeEvent(event, "Europe/Paris");
    expect(serializeComponent(event).slice(1, 4)).toEqual([
      "DTSTART;TZID=Europe/Paris:20261109T094500",
      "DTEND;TZID=Europe/London:20261109T100000",
      "DTSTAMP:20261108T165235Z",
    ]);
  });

  it("validates zone names", () => {
    expect(isValidTimeZone("Europe/Paris")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});
