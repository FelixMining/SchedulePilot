import { extractEvent, type EventInfo } from "./extract";
import { getProperty, getText, icsDateToIso, parseIcs, serializeIcs, setRaw, setText, type IcsComponent } from "./ics";
import { renderEvent } from "./render";
import type { Settings } from "./settings";

interface SourceEvent {
  component: IcsComponent;
  info: EventInfo;
}

function readSource(calendar: IcsComponent): SourceEvent[] {
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
  const tz = getProperty(calendar, "X-WR-TIMEZONE");
  if (tz) output.properties.push(tz);
  if (options.color) setRaw(output, "X-APPLE-CALENDAR-COLOR", options.color.toUpperCase());
  const refresh = `PT${options.refreshMinutes ?? 60}M`;
  setRaw(output, "REFRESH-INTERVAL", refresh, [{ name: "VALUE", value: "DURATION" }]);
  setRaw(output, "X-PUBLISHED-TTL", refresh);

  // Keep VTIMEZONE and friends untouched so TZID references stay valid.
  output.components.push(...calendar.components.filter((c) => c.name !== "VEVENT"));

  for (const { component, info } of readSource(calendar)) {
    const r = renderEvent(info, settings);
    if (r.hidden || (options.feed !== null && r.feed !== options.feed)) continue;

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
