import type { PreviewEvent } from "../shared/calendar";
import type { Rule, RuleInput } from "../shared/rules/schema";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Erreur ${res.status}`, res.status);
  return data as T;
}

export interface User {
  id: string;
  email: string;
}

export interface Calendar {
  id: string;
  name: string;
  sourceUrl: string;
  color: string | null;
  feedToken: string;
  cachedAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  lastServedAt: string | null;
  createdAt: string;
}

export interface Group {
  id: string;
  calendarId: string;
  name: string;
  color: string;
  position: number;
}

export interface Course {
  key: string;
  code: string;
  sample: string;
  count: number;
  types: string[];
  nextStart: string | null;
  rule: Rule | null;
  preview: { hidden: boolean; summary: string; groupId: string | null };
}

export interface CalendarDetail {
  calendar: Calendar;
  groups: Group[];
  rules: Rule[];
}

export interface CourseEdit {
  title: string;
  hidden: boolean;
  groupId: string | null;
}

export const api = {
  me: () => request<{ user: User | null }>("GET", "/auth/me"),
  login: (email: string, password: string) => request<{ user: User }>("POST", "/auth/login", { email, password }),
  register: (email: string, password: string) => request<{ user: User }>("POST", "/auth/register", { email, password }),
  logout: () => request<void>("POST", "/auth/logout"),
  changePassword: (current: string, next: string) => request<void>("POST", "/auth/password", { current, next }),
  deleteAccount: (password: string) => request<void>("DELETE", "/auth/me", { password }),

  calendars: () => request<{ calendars: Calendar[] }>("GET", "/calendars"),
  calendar: (id: string) => request<CalendarDetail>("GET", `/calendars/${id}`),
  createCalendar: (input: { name: string; sourceUrl: string }) =>
    request<{ calendar: Calendar }>("POST", "/calendars", input),
  updateCalendar: (id: string, input: Partial<Pick<Calendar, "name" | "sourceUrl" | "color">>) =>
    request<{ calendar: Calendar }>("PATCH", `/calendars/${id}`, input),
  deleteCalendar: (id: string) => request<void>("DELETE", `/calendars/${id}`),
  rotateToken: (id: string) => request<{ calendar: Calendar }>("POST", `/calendars/${id}/rotate-token`),
  refresh: (id: string) =>
    request<{ calendar: Calendar; stale: boolean; error: string | null }>("POST", `/calendars/${id}/refresh`),

  courses: (id: string) => request<{ courses: Course[] }>("GET", `/calendars/${id}/courses`),
  saveCourse: (id: string, key: string, edit: CourseEdit) =>
    request<{ rule: Rule | null }>("PUT", `/calendars/${id}/courses/${encodeURIComponent(key)}`, edit),
  preview: (id: string) =>
    request<{ events: PreviewEvent[]; stale: boolean; error: string | null }>("GET", `/calendars/${id}/preview`),

  createRule: (id: string, rule: RuleInput) => request<{ rule: Rule }>("POST", `/calendars/${id}/rules`, rule),
  updateRule: (id: string, ruleId: string, rule: RuleInput) =>
    request<{ rule: Rule }>("PUT", `/calendars/${id}/rules/${ruleId}`, rule),
  deleteRule: (id: string, ruleId: string) => request<void>("DELETE", `/calendars/${id}/rules/${ruleId}`),
  reorderRules: (id: string, ids: string[]) =>
    request<{ rules: Rule[] }>("PUT", `/calendars/${id}/rules/order`, { ids }),

  createGroup: (id: string, input: { name: string; color: string }) =>
    request<{ group: Group }>("POST", `/calendars/${id}/groups`, input),
  updateGroup: (id: string, groupId: string, input: Partial<{ name: string; color: string }>) =>
    request<{ group: Group }>("PATCH", `/calendars/${id}/groups/${groupId}`, input),
  deleteGroup: (id: string, groupId: string) => request<void>("DELETE", `/calendars/${id}/groups/${groupId}`),
};

export function feedUrl(token: string, group?: string): string {
  const path = group ? `/feed/${token}/${group}.ics` : `/feed/${token}.ics`;
  return `${window.location.origin}${path}`;
}

export function webcalUrl(url: string): string {
  return url.replace(/^https?:/, "webcal:");
}
