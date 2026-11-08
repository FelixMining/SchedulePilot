import type { SessionType } from "../../../shared/extract";
import type { EditorEvent } from "./editor";

export interface CourseSummary {
  key: string;
  code: string;
  courseName: string;
  name: string;
  color: string;
  hidden: boolean;
  count: number;
  upcoming: number;
  exams: number;
  types: SessionType[];
  teachers: string[];
  next: string | null;
  /** Real courses, as opposed to one-off events (meetings, campus tour…). */
  regular: boolean;
}

const TYPE_ORDER: SessionType[] = ["CM", "TD", "TP", "Examen", "Autre"];

export function summarizeCourses(events: EditorEvent[], now = Date.now()): CourseSummary[] {
  const map = new Map<string, CourseSummary>();
  for (const { info, view } of events) {
    let c = map.get(info.key);
    if (!c) {
      c = {
        key: info.key,
        code: info.code,
        courseName: info.courseName,
        name: view.name,
        color: view.color,
        hidden: view.hidden,
        count: 0,
        upcoming: 0,
        exams: 0,
        types: [],
        teachers: [],
        next: null,
        regular: false,
      };
      map.set(info.key, c);
    }
    c.count++;
    if (view.exam) c.exams++;
    else c.color = view.color;
    if (!c.types.includes(view.type)) c.types.push(view.type);
    for (const t of info.teachers) if (!c.teachers.includes(t)) c.teachers.push(t);
    const start = info.start ? Date.parse(info.start) : 0;
    if (start >= now) {
      c.upcoming++;
      if (!c.next || start < Date.parse(c.next)) c.next = info.start;
    }
  }

  const courses = [...map.values()];
  for (const c of courses) {
    c.types.sort((a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b));
    c.regular = c.code !== "" || c.count >= 3;
  }
  return courses.sort(
    (a, b) => Number(b.regular) - Number(a.regular) || a.name.localeCompare(b.name, "fr", { sensitivity: "base" }),
  );
}
