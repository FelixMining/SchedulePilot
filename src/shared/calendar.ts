import {
  getProperty,
  getText,
  icsDateToIso,
  isoToTime,
  parseIcs,
  serializeIcs,
  setRaw,
  setText,
  type IcsComponent,
} from "./ics";
import { applyRules, detectCode, detectType, type EventFields, type Rule, type TransformResult } from "./rules";

export interface SourceEvent {
  component: IcsComponent;
  uid: string;
  start: string | null;
  end: string | null;
  fields: EventFields;
}

export type FeedFilter = { kind: "all" } | { kind: "ungrouped" } | { kind: "group"; groupId: string };

export interface FeedOptions {
  name: string;
  color?: string | null;
  filter: FeedFilter;
  refreshMinutes?: number;
}

export interface PreviewEvent {
  uid: string;
  start: string | null;
  end: string | null;
  original: EventFields;
  result: TransformResult;
}

export interface CourseSummary {
  key: string;
  code: string;
  sample: string;
  count: number;
  types: string[];
  nextStart: string | null;
}

export function readEvents(calendar: IcsComponent): SourceEvent[] {
  return calendar.components
    .filter((c) => c.name === "VEVENT")
    .map((component) => ({
      component,
      uid: getText(component, "UID"),
      start: icsDateToIso(getProperty(component, "DTSTART")),
      end: icsDateToIso(getProperty(component, "DTEND")),
      fields: {
        summary: getText(component, "SUMMARY").trim(),
        description: getText(component, "DESCRIPTION").trim(),
        location: getText(component, "LOCATION").trim(),
      },
    }));
}

function keepEvent(result: TransformResult, filter: FeedFilter): boolean {
  if (result.hidden) return false;
  if (filter.kind === "ungrouped") return result.groupId === null;
  if (filter.kind === "group") return result.groupId === filter.groupId;
  return true;
}

export function buildFeed(source: string, rules: Rule[], options: FeedOptions): string {
  const calendar = parseIcs(source);
  const output: IcsComponent = { name: "VCALENDAR", properties: [], components: [] };

  setRaw(output, "VERSION", "2.0");
  setRaw(output, "PRODID", "-//SchedulePilot//Calendar Relay//FR");
  setRaw(output, "CALSCALE", "GREGORIAN");
  setRaw(output, "METHOD", "PUBLISH");
  setText(output, "X-WR-CALNAME", options.name);
  const tz = getProperty(calendar, "X-WR-TIMEZONE");
  if (tz) output.properties.push(tz);
  if (options.color) setRaw(output, "X-APPLE-CALENDAR-COLOR", options.color);
  const refresh = `PT${options.refreshMinutes ?? 60}M`;
  setRaw(output, "REFRESH-INTERVAL", refresh, [{ name: "VALUE", value: "DURATION" }]);
  setRaw(output, "X-PUBLISHED-TTL", refresh);

  // Keep VTIMEZONE and friends untouched so TZID references stay valid.
  output.components.push(...calendar.components.filter((c) => c.name !== "VEVENT"));

  for (const event of readEvents(calendar)) {
    const result = applyRules(rules, event.fields);
    if (!keepEvent(result, options.filter)) continue;
    setText(event.component, "SUMMARY", result.summary);
    setText(event.component, "DESCRIPTION", result.description);
    setText(event.component, "LOCATION", result.location);
    output.components.push(event.component);
  }

  return serializeIcs(output);
}

export function previewEvents(
  source: string,
  rules: Rule[],
  { from = Date.now() - 24 * 3600_000, limit = 200 }: { from?: number; limit?: number } = {},
): PreviewEvent[] {
  return readEvents(parseIcs(source))
    .filter((e) => isoToTime(e.end ?? e.start) >= from)
    .sort((a, b) => isoToTime(a.start) - isoToTime(b.start))
    .slice(0, limit)
    .map((e) => ({
      uid: e.uid,
      start: e.start,
      end: e.end,
      original: e.fields,
      result: applyRules(rules, e.fields),
    }));
}

/**
 * Groups events by course. The course code is used when one can be found in the
 * title, so "HAI203I TD" and "HAI203I CM" end up in the same bucket.
 */
export function summarizeCourses(source: string, now = Date.now()): CourseSummary[] {
  const courses = new Map<string, CourseSummary>();

  for (const e of readEvents(parseIcs(source))) {
    const code = detectCode(e.fields.summary);
    const key = code || e.fields.summary;
    if (!key) continue;

    let course = courses.get(key);
    if (!course) {
      course = { key, code, sample: e.fields.summary, count: 0, types: [], nextStart: null };
      courses.set(key, course);
    }
    course.count++;

    const type = detectType(e.fields.summary, e.fields.description);
    if (type && !course.types.includes(type)) course.types.push(type);

    const t = isoToTime(e.start);
    if (t >= now && (!course.nextStart || t < isoToTime(course.nextStart))) course.nextStart = e.start;
  }

  return [...courses.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}
