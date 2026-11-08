/**
 * University exports usually give times in UTC ("20261109T084500Z"). Calendar
 * apps then treat the event as being in GMT and show both times ("09:45
 * (08:45 GMT)"). Converting to local time with a TZID avoids that.
 */
import type { IcsComponent, IcsProperty } from "./ics";

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** "20261109T084500Z" → "20261109T094500" in Europe/Paris. */
export function utcToLocal(value: string, timeZone: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  if (!m) return null;
  const date = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!, +m[6]!));
  const p = Object.fromEntries(
    formatter(timeZone)
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}${p.month}${p.day}T${p.hour}${p.minute}${p.second}`;
}

/** Offset from UTC in minutes at a given instant. */
function offsetAt(timeZone: string, date: Date): number {
  const local = utcToLocal(
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, ""),
    timeZone,
  )!;
  const asUtc = Date.UTC(
    +local.slice(0, 4),
    +local.slice(4, 6) - 1,
    +local.slice(6, 8),
    +local.slice(9, 11),
    +local.slice(11, 13),
  );
  return Math.round((asUtc - date.getTime()) / 60_000);
}

const formatOffset = (minutes: number) => {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}${String(abs % 60).padStart(2, "0")}`;
};

function observance(name: "STANDARD" | "DAYLIGHT", from: number, to: number, start: string, rrule?: string) {
  const component: IcsComponent = { name, properties: [], components: [] };
  const prop = (n: string, value: string): IcsProperty => ({ name: n, params: [], value });
  component.properties.push(prop("TZOFFSETFROM", formatOffset(from)), prop("TZOFFSETTO", formatOffset(to)));
  component.properties.push(prop("DTSTART", start));
  if (rrule) component.properties.push(prop("RRULE", rrule));
  return component;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Builds a VTIMEZONE for the zone. Zones without daylight saving time get a
 * fixed offset; European and North American zones get their usual rules.
 * Anything else returns null and calendar apps fall back on the zone name.
 */
export function buildVTimezone(timeZone: string): IcsComponent | null {
  const year = new Date().getUTCFullYear();
  const winter = offsetAt(timeZone, new Date(Date.UTC(year, 0, 15)));
  const summer = offsetAt(timeZone, new Date(Date.UTC(year, 6, 15)));
  const tz: IcsComponent = {
    name: "VTIMEZONE",
    properties: [{ name: "TZID", params: [], value: timeZone }],
    components: [],
  };

  if (winter === summer) {
    tz.components.push(observance("STANDARD", winter, winter, "19700101T000000"));
    return tz;
  }
  if (summer < winter) return null; // southern hemisphere: no generic rule

  if (timeZone.startsWith("Europe/") || timeZone.startsWith("Atlantic/")) {
    // EU: last Sunday of March and October, at 01:00 UTC.
    const springHour = 1 + winter / 60;
    const fallHour = 1 + summer / 60;
    tz.components.push(
      observance("DAYLIGHT", winter, summer, `19700329T${pad(springHour)}0000`, "FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU"),
      observance("STANDARD", summer, winter, `19701025T${pad(fallHour)}0000`, "FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU"),
    );
    return tz;
  }
  if (timeZone.startsWith("America/")) {
    // US and Canada: second Sunday of March and first Sunday of November, at 02:00 local time.
    tz.components.push(
      observance("DAYLIGHT", winter, summer, "19700308T020000", "FREQ=YEARLY;BYMONTH=3;BYDAY=2SU"),
      observance("STANDARD", summer, winter, "19701101T020000", "FREQ=YEARLY;BYMONTH=11;BYDAY=1SU"),
    );
    return tz;
  }
  return null;
}

const DATE_PROPS = ["DTSTART", "DTEND", "RECURRENCE-ID", "EXDATE", "RDATE"];

/** Rewrites UTC date-times of an event as local times in `timeZone`. */
export function localizeEvent(event: IcsComponent, timeZone: string): void {
  for (const prop of event.properties) {
    if (!DATE_PROPS.includes(prop.name) || prop.params.some((p) => p.name === "TZID")) continue;
    const values = prop.value.split(",").map((v) => utcToLocal(v, timeZone));
    if (values.some((v) => v === null)) continue;
    prop.value = values.join(",");
    prop.params = [{ name: "TZID", value: timeZone }, ...prop.params.filter((p) => p.name !== "VALUE")];
  }
}
