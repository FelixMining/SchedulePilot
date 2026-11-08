/**
 * Turns raw timetable events into structured data. University exports (ADE,
 * Hyperplanning…) cram everything into free text: the course code in the title,
 * the real course name, the teacher and dozens of group names in the description,
 * and the kind of session only shows through the room ("Amphi", "TD info"…).
 */

export type SessionType = "CM" | "TD" | "TP" | "Examen" | "Autre";
export const SESSION_TYPES: SessionType[] = ["CM", "TD", "TP", "Examen", "Autre"];

export interface EventFields {
  summary: string;
  description: string;
  location: string;
}

export interface EventInfo {
  uid: string;
  start: string | null;
  end: string | null;
  /** Identifies the course: its code when there is one, otherwise a cleaned title. */
  key: string;
  code: string;
  /** Full course name found in the description, or a cleaned-up title. */
  courseName: string;
  type: SessionType;
  rooms: string[];
  teachers: string[];
  groups: string[];
  notes: string[];
  original: EventFields;
}

const CODE = /\b([A-Z]{2,5})[- ]?(\d{2,4}[A-Z]{0,2}\d?)\b/;

export function detectCode(summary: string): string {
  const m = CODE.exec(summary);
  return m ? `${m[1]}${m[2]}` : "";
}

const META_LINE = /^(\(export|a valider$|validé$|annulé$)/i;
const GROUP_LINE =
  /(\bgr(oupe)?s?\b|\bgr[a-z0-9]\b|portail|\b[LM][1-3]\b|licence|master|s[ée]rie|cupge|\blas\b|double|promo|parcours|section|mineure|majeure)/i;
// ADE writes teachers as "LASTNAME   FIRSTNAME", in capitals, with several spaces.
const TEACHER_LINE = /^[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ'’ -]*\s{2,}[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ'’ -]*$/;

const capitalize = (s: string) =>
  s.toLocaleLowerCase("fr").replace(/(^|[\s'’-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());

export function formatTeacher(line: string): string {
  const [last = "", first = ""] = line.trim().split(/\s{2,}/);
  return `${capitalize(first)} ${capitalize(last)}`.trim();
}

export function cleanRoom(raw: string): string | null {
  const room = raw.trim().replace(/\s+/g, " ");
  if (!room || /^(pas de salle|aucune salle|sans salle|-)$/i.test(room)) return null;
  let m = /^(?:td\s*info|tdinfo|salle\s*info)\s*(.+)$/i.exec(room);
  if (m) return `Salle info ${m[1]}`;
  m = /^(?:td|tp)\s*(\d.*)$/i.exec(room);
  if (m) return `Salle ${m[1]}`;
  m = /^amphi\s*(.+)$/i.exec(room);
  if (m) return `Amphi ${m[1]}`;
  return room;
}

/** "INFO GR C - L1 Portail informatique - Gr C - …" → "INFO GR C" */
function shortGroup(line: string): string {
  return line.split(" - ")[0]!.trim();
}

function detectType(summary: string, notes: string[], rawLocation: string): SessionType {
  const text = [summary, ...notes].join(" ");
  if (/\b(CM|cours magistral)\b/i.test(text)) return "CM";
  if (/\bTP\b/.test(text)) return "TP";
  if (/\bTD\b/.test(text)) return "TD";
  if (/amphi/i.test(rawLocation)) return "CM";
  if (/(td\s*info|tdinfo|salle\s*info|\btp\b)/i.test(rawLocation)) return "TP";
  if (/^\s*td\b|^\s*td\d/i.test(rawLocation)) return "TD";
  return "Autre";
}

/** Fallback name built from the title when the description has no course name. */
export function cleanTitle(summary: string): string {
  return summary
    .replace(/^\d{6,8}\s*-\s*/, "") // "04092026 - SPORT"
    .replace(CODE, "")
    .replace(/(^|\s)Gr\s?[A-Z0-9]\b.*$/i, "") // "… Gr C, D, E et F", "… GrC"
    .replace(/\b(CM|TD|TP)\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s-–·]+|[\s-–·]+$/g, "")
    .trim();
}

export function extractEvent(uid: string, start: string | null, end: string | null, original: EventFields): EventInfo {
  const code = detectCode(original.summary);
  const lines = original.description
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !META_LINE.test(l));

  const teachers: string[] = [];
  const groups: string[] = [];
  const rest: string[] = [];
  for (const line of lines) {
    if (TEACHER_LINE.test(line) && line.split(/\s{2,}/).length === 2) teachers.push(formatTeacher(line));
    else if (GROUP_LINE.test(line)) groups.push(shortGroup(line));
    else rest.push(line);
  }

  const [courseLine, ...notes] = rest;
  const title = cleanTitle(original.summary);
  const courseName = courseLine ?? (title || original.summary);
  const rooms = original.location
    .split(",")
    .map(cleanRoom)
    .filter((r): r is string => r !== null);

  return {
    uid,
    start,
    end,
    key: code || title || original.summary,
    code,
    courseName,
    type: detectType(original.summary, notes, original.location),
    rooms: [...new Set(rooms)],
    teachers,
    groups: [...new Set(groups)],
    notes,
    original,
  };
}
