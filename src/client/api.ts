import type { EventInfo } from "../shared/extract";
import type { Settings } from "../shared/settings";

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
  feedToken: string;
  settings: Settings;
  cachedAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  lastServedAt: string | null;
  createdAt: string;
}

export interface EventsResponse {
  events: EventInfo[];
  stale: boolean;
  error: string | null;
  fetchedAt: string;
}

export const api = {
  me: () => request<{ user: User | null }>("GET", "/auth/me"),
  login: (email: string, password: string) => request<{ user: User }>("POST", "/auth/login", { email, password }),
  register: (email: string, password: string) => request<{ user: User }>("POST", "/auth/register", { email, password }),
  logout: () => request<void>("POST", "/auth/logout"),
  changePassword: (current: string, next: string) => request<void>("POST", "/auth/password", { current, next }),
  deleteAccount: (password: string) => request<void>("DELETE", "/auth/me", { password }),

  calendars: () => request<{ calendars: Calendar[] }>("GET", "/calendars"),
  calendar: (id: string) => request<{ calendar: Calendar }>("GET", `/calendars/${id}`),
  createCalendar: (input: { name: string; sourceUrl: string }) =>
    request<{ calendar: Calendar }>("POST", "/calendars", input),
  updateCalendar: (id: string, input: Partial<Pick<Calendar, "name" | "sourceUrl">>) =>
    request<{ calendar: Calendar }>("PATCH", `/calendars/${id}`, input),
  saveSettings: (id: string, settings: Settings) =>
    request<{ calendar: Calendar }>("PUT", `/calendars/${id}/settings`, settings),
  deleteCalendar: (id: string) => request<void>("DELETE", `/calendars/${id}`),
  rotateToken: (id: string) => request<{ calendar: Calendar }>("POST", `/calendars/${id}/rotate-token`),
  refresh: (id: string) =>
    request<{ calendar: Calendar; stale: boolean; error: string | null }>("POST", `/calendars/${id}/refresh`),
  events: (id: string) => request<EventsResponse>("GET", `/calendars/${id}/events`),
};

export function feedUrl(token: string, feed?: string): string {
  const path = feed ? `/feed/${token}/${feed}.ics` : `/feed/${token}.ics`;
  return `${window.location.origin}${path}`;
}

export function webcalUrl(url: string): string {
  return url.replace(/^https?:/, "webcal:");
}

export function profileUrl(token: string): string {
  return `${window.location.origin}/feed/${token}/apple.mobileconfig`;
}
