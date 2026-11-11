import { extractEvent, type EventInfo } from "./extract";
import { getProperty, getText, icsDateToIso, parseIcs, serializeIcs, setRaw, setText, type IcsComponent } from "./ics";
import { renderEvent } from "./render";
import type { Settings } from "./settings";
import { buildVTimezone, localizeEvent } from "./timezone";

interface SourceEvent {
  component: IcsComponent;
  info: EventInfo;
}

function readSource(calendar: IcsComponent): SourceEvent[] {
  return assignIds(readRaw(calendar));
}

function readRaw(calendar: IcsComponent): SourceEvent[] {
  return calendar.components
    .filter((c) => c.name === "VEVENT")
    .map((component) => ({
      component,
      info: extractEvent(
        getText(component, "UID"),
        icsDateToIso(getProperty(component, "DTSTART")),
        icsDateToIso(getProperty(component, "DTEND")),
        {
          summary: getText(component, "SUMMARY").trim(),
          description: getText(component, "DESCRIPTION").trim(),
          location: getText(component, "LOCATION").trim(),
        },
      ),
    }));
}

/** Events sharing a UID (recurring series, sloppy exports) get the start time added to their id. */
function assignIds(events: SourceEvent[]): SourceEvent[] {
  const counts = new Map<string, number>();
  for (const { info } of events) counts.set(info.uid, (counts.get(info.uid) ?? 0) + 1);
  for (const { info } of events) {
    if (!info.uid || counts.get(info.uid)! > 1) info.id = `${info.uid}|${info.start ?? ""}`;
  }
  return events;
}

export function readEvents(source: string): EventInfo[] {
  return readSource(parseIcs(source)).map((e) => e.info);
}

export interface FeedOptions {
  name: string;
  color?: string | null;
  /** Only keep events of this calendar (see `renderEvent().feed`). Null keeps everything. */
  feed: string | null;
  refreshMinutes?: number;
}

function alarm(trigger: string, description: string): IcsComponent {
  const component: IcsComponent = { name: "VALARM", properties: [], components: [] };
  setRaw(component, "ACTION", "DISPLAY");
  setText(component, "DESCRIPTION", description);
  setRaw(component, "TRIGGER", trigger);
  return component;
}

export function buildFeed(source: string, settings: Settings, options: FeedOptions): string {
  const calendar = parseIcs(source);
  const output: IcsComponent = { name: "VCALENDAR", properties: [], components: [] };

  setRaw(output, "VERSION", "2.0");
  setRaw(output, "PRODID", "-//SchedulePilot//Calendar Relay//FR");
  setRaw(output, "CALSCALE", "GREGORIAN");
  setRaw(output, "METHOD", "PUBLISH");
  setText(output, "X-WR-CALNAME", options.name);
  setRaw(output, "X-WR-TIMEZONE", settings.timeZone);
  if (options.color) setRaw(output, "X-APPLE-CALENDAR-COLOR", options.color.toUpperCase());
  const refresh = `PT${options.refreshMinutes ?? 60}M`;
  setRaw(output, "REFRESH-INTERVAL", refresh, [{ name: "VALUE", value: "DURATION" }]);
  setRaw(output, "X-PUBLISHED-TTL", refresh);

  // Keep the source's VTIMEZONEs so its own TZID references stay valid.
  const sourceZones = calendar.components.filter((c) => c.name !== "VEVENT");
  output.components.push(...sourceZones);
  const zone = buildVTimezone(settings.timeZone);
  const hasZone = sourceZones.some((c) => c.name === "VTIMEZONE" && getText(c, "TZID") === settings.timeZone);
  if (zone && !hasZone) output.components.push(zone);

  for (const { component, info } of readSource(calendar)) {
    const r = renderEvent(info, settings);
    if (r.hidden || (options.feed !== null && r.feed !== options.feed)) continue;

    localizeEvent(component, settings.timeZone);
    setText(component, "SUMMARY", r.title);
    setText(component, "LOCATION", r.location);
    setText(component, "DESCRIPTION", r.description);
    setText(component, "CATEGORIES", r.type === "Autre" ? "" : r.type);

    component.components = component.components.filter((c) => c.name !== "VALARM");
    if (r.exam && settings.alarms.examDaysBefore > 0) {
      component.components.push(alarm(`-P${settings.alarms.examDaysBefore}D`, r.title));
    } else if (!r.exam && settings.alarms.minutesBefore > 0) {
      component.components.push(alarm(`-PT${settings.alarms.minutesBefore}M`, r.title));
    }
    output.components.push(component);
  }

  return serializeIcs(output);
}
