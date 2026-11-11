import type { SessionType } from "./extract";

export type ColorMode = "course" | "type" | "single";
export type TypePosition = "after" | "before" | "none" | "custom";

export interface CourseSettings {
  name?: string;
  color?: string;
  hidden?: boolean;
}

export interface Settings {
  /** How events are split into calendars (Apple Calendar has one color per calendar). */
  colorMode: ColorMode;
  /** Put exams in their own calendar, whatever the color mode. */
  examsSeparate: boolean;
  /** Color of the calendar in "single" mode. */
  singleColor: string;
  /** Times are written in this zone, so calendar apps do not show a second (GMT) time. */
  timeZone: string;
  title: {
    typePosition: TypePosition;
    /** Used when typePosition is "custom", e.g. "{num_salle} · {matiere} {type}". */
    template: string;
    highlightExams: boolean;
  };
  location: {
    /** Calendar apps show the location under the title: a good spot for the teacher. */
    teachers: boolean;
  };
  description: {
    type: boolean;
    rooms: boolean;
    teachers: boolean;
    course: boolean;
    groups: boolean;
  };
  examKeywords: string[];
  hideKeywords: string[];
  alarms: {
    /** Reminder before exams, in days. 0 disables it. */
    examDaysBefore: number;
    /** Reminder before every other event, in minutes. 0 disables it. */
    minutesBefore: number;
  };
  typeColors: Record<SessionType, string>;
  courses: Record<string, CourseSettings>;
  /** Single occurrences hidden by the user (see `EventInfo.id`). */
  hiddenEvents: string[];
}

export const PALETTE = [
  "#3b82f6",
  "#f97316",
  "#22c55e",
  "#a855f7",
  "#eab308",
  "#14b8a6",
  "#ec4899",
  "#78716c",
  "#0ea5e9",
  "#84cc16",
  "#6366f1",
  "#d946ef",
];

export const EXAM_COLOR = "#ef4444";

export const DEFAULT_SETTINGS: Settings = {
  colorMode: "course",
  examsSeparate: true,
  singleColor: "#3b82f6",
  timeZone: "Europe/Paris",
  title: { typePosition: "after", template: "{num_salle} · {matiere} {type}", highlightExams: true },
  location: { teachers: true },
  description: { type: true, rooms: true, teachers: true, course: true, groups: false },
  examKeywords: ["examen", "partiel", "contrôle", "CC", "DS", "évaluation", "soutenance", "rattrapage"],
  hideKeywords: [],
  alarms: { examDaysBefore: 1, minutesBefore: 0 },
  typeColors: { CM: "#3b82f6", TD: "#22c55e", TP: "#a855f7", Examen: EXAM_COLOR, Autre: "#64748b" },
  courses: {},
  hiddenEvents: [],
};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Fills missing fields with defaults, so settings saved by older versions keep working. */
export function resolveSettings(stored: unknown): Settings {
  const s = isObject(stored) ? stored : {};
  const pick = <K extends keyof Settings>(key: K): Settings[K] => {
    const value = s[key];
    const fallback = DEFAULT_SETTINGS[key];
    if (isObject(fallback) && key !== "courses") {
      return { ...(fallback as object), ...(isObject(value) ? value : {}) } as Settings[K];
    }
    return (value ?? fallback) as Settings[K];
  };
  return {
    colorMode: pick("colorMode"),
    examsSeparate: pick("examsSeparate"),
    singleColor: pick("singleColor"),
    timeZone: pick("timeZone"),
    title: pick("title"),
    location: pick("location"),
    description: pick("description"),
    examKeywords: pick("examKeywords"),
    hideKeywords: pick("hideKeywords"),
    alarms: pick("alarms"),
    typeColors: pick("typeColors"),
    courses: isObject(s.courses) ? (s.courses as Settings["courses"]) : {},
    hiddenEvents: Array.isArray(s.hiddenEvents) ? (s.hiddenEvents as string[]) : [],
  };
}
