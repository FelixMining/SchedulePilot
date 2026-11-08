import type { EventInfo, SessionType } from "./extract";
import { EXAM_COLOR, PALETTE, type Settings } from "./settings";

export interface RenderedEvent {
  hidden: boolean;
  exam: boolean;
  type: SessionType;
  name: string;
  title: string;
  location: string;
  description: string;
  feed: string;
  color: string;
}

export interface FeedInfo {
  key: string;
  name: string;
  color: string;
}

const TYPE_LABELS: Record<SessionType, string> = {
  CM: "Cours magistral",
  TD: "TD",
  TP: "TP",
  Examen: "Examen",
  Autre: "",
};

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Whole-word, case and accent insensitive keyword search. */
export function matchesKeyword(text: string, keywords: string[]): boolean {
  const haystack = ` ${normalize(text).replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  return keywords.some((k) => {
    const needle = normalize(k)
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
    return needle !== "" && haystack.includes(` ${needle} `);
  });
}

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function courseColor(key: string, settings: Settings): string {
  return settings.courses[key]?.color ?? PALETTE[hash(key) % PALETTE.length]!;
}

export function courseName(info: Pick<EventInfo, "key" | "courseName">, settings: Settings): string {
  return settings.courses[info.key]?.name?.trim() || info.courseName;
}

export const feedSlug = (key: string) =>
  normalize(key)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "cours";

export function renderEvent(info: EventInfo, settings: Settings): RenderedEvent {
  const name = courseName(info, settings);
  const exam = matchesKeyword(`${info.original.summary} ${info.courseName}`, settings.examKeywords);
  const type: SessionType = exam ? "Examen" : info.type;
  const hidden =
    (settings.courses[info.key]?.hidden ?? false) ||
    matchesKeyword(`${info.original.summary} ${info.courseName}`, settings.hideKeywords);

  let title = name;
  if (exam && settings.title.highlightExams) title = `EXAMEN · ${name}`;
  else if (type !== "Autre" && settings.title.typePosition === "after") title = `${name} · ${type}`;
  else if (type !== "Autre" && settings.title.typePosition === "before") title = `${type} · ${name}`;

  const d = settings.description;
  const lines: string[] = [];
  const head = [d.type ? TYPE_LABELS[type] : "", d.rooms ? info.rooms.join(", ") : ""].filter(Boolean);
  if (head.length) lines.push(head.join(" · "));
  if (d.teachers && info.teachers.length) lines.push(info.teachers.join(", "));
  if (d.course && (info.code || info.courseName !== name)) {
    lines.push([info.courseName !== name ? info.courseName : "", info.code].filter(Boolean).join(" · "));
  }
  if (d.groups && info.groups.length) lines.push(`Groupes : ${info.groups.join(", ")}`);
  lines.push(...info.notes);

  let feed = "cours";
  let color = settings.singleColor;
  if (exam && (settings.examsSeparate || settings.colorMode === "type")) {
    feed = "examens";
    color = EXAM_COLOR;
  } else if (settings.colorMode === "type") {
    feed = type.toLowerCase();
    color = settings.typeColors[type];
  } else if (settings.colorMode === "course") {
    // One-off events (meetings, campus tour…) share a single "Autres" calendar,
    // unless they were given a color of their own.
    if (info.code || settings.courses[info.key]?.color) {
      feed = feedSlug(info.key);
      color = courseColor(info.key, settings);
    } else {
      feed = "autres";
      color = settings.typeColors.Autre;
    }
  }

  return {
    hidden,
    exam,
    type,
    name,
    title,
    location: [info.rooms.join(", "), settings.location.teachers ? info.teachers.join(", ") : ""]
      .filter(Boolean)
      .join(" · "),
    description: lines.join("\n"),
    feed,
    color,
  };
}

const TYPE_FEED_NAMES: Record<SessionType, string> = {
  CM: "Cours magistraux",
  TD: "TD",
  TP: "TP",
  Examen: "Examens",
  Autre: "Autres",
};

/** Lists the calendars generated for the current settings, in a stable order. */
export function listFeeds(events: EventInfo[], settings: Settings): FeedInfo[] {
  const feeds = new Map<string, FeedInfo>();
  for (const info of events) {
    const r = renderEvent(info, settings);
    if (r.hidden || feeds.has(r.feed)) continue;
    const name =
      r.feed === "examens"
        ? "Examens"
        : r.feed === "autres"
          ? "Autres"
          : settings.colorMode === "type"
            ? TYPE_FEED_NAMES[r.type]
            : settings.colorMode === "single"
              ? "Cours"
              : r.name;
    feeds.set(r.feed, { key: r.feed, name, color: r.color });
  }
  const order = (f: FeedInfo) => (f.key === "examens" ? 2 : f.key === "autres" ? 1 : 0);
  return [...feeds.values()].sort((a, b) => order(a) - order(b) || a.name.localeCompare(b.name, "fr"));
}
