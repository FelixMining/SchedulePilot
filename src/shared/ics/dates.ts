import type { IcsProperty } from "./parse";

/**
 * Converts a DTSTART/DTEND value to an ISO string. Values carrying a TZID are
 * returned as local times (no offset), which is good enough for display and sorting.
 */
export function icsDateToIso(prop: IcsProperty | undefined): string | null {
  if (!prop) return null;
  const v = prop.value.trim();

  const date = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (date) return `${date[1]}-${date[2]}-${date[3]}`;

  const dt = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(v);
  if (!dt) return null;
  const [, y, mo, d, h, mi, s, z] = dt;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}${z ? "Z" : ""}`;
}

export function isoToTime(iso: string | null): number {
  if (!iso) return 0;
  const t = Date.parse(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(t) ? 0 : t;
}
