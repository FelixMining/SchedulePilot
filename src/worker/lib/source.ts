import { eq } from "drizzle-orm";
import { parseIcs } from "../../shared/ics";
import type { Database } from "../db/client";
import { calendars, type CalendarRow } from "../db/schema";

export const CACHE_TTL_MS = 15 * 60_000;
const MAX_SIZE = 10 * 1024 * 1024;
const TIMEOUT_MS = 15_000;

export class SourceError extends Error {}

export function normalizeSourceUrl(input: string): string {
  let raw = input.trim();
  if (/^webcals?:\/\//i.test(raw)) raw = raw.replace(/^webcals?:/i, "https:");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SourceError("URL invalide");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new SourceError("Seules les URL http(s) et webcal sont acceptées");
  }
  if (url.username || url.password) throw new SourceError("Les identifiants dans l'URL ne sont pas acceptés");
  return url.toString();
}

export async function downloadIcs(url: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { "User-Agent": "SchedulePilot/1.0 (+calendar relay)", Accept: "text/calendar, */*" },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new SourceError(`Impossible de joindre le serveur (${err instanceof Error ? err.message : "erreur réseau"})`);
  }
  if (!response.ok) throw new SourceError(`Le serveur a répondu ${response.status}`);

  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_SIZE) throw new SourceError("Le calendrier est trop volumineux");

  const body = await response.text();
  if (body.length > MAX_SIZE) throw new SourceError("Le calendrier est trop volumineux");

  try {
    parseIcs(body);
  } catch {
    throw new SourceError("Le contenu reçu n'est pas un calendrier ICS valide");
  }
  return body;
}

export interface SourceResult {
  ics: string;
  fetchedAt: Date;
  stale: boolean;
  error: string | null;
}

/**
 * Returns the upstream ICS, refreshing it when the cached copy is too old.
 * If the university server is down we keep serving the last good copy.
 */
export async function loadSource(
  db: Database,
  calendar: CalendarRow,
  { force = false, fetchImpl }: { force?: boolean; fetchImpl?: typeof fetch } = {},
): Promise<SourceResult> {
  const cachedAt = calendar.cachedAt?.getTime() ?? 0;

  if (!force && calendar.cachedIcs && calendar.cachedAt && Date.now() - cachedAt < CACHE_TTL_MS) {
    return { ics: calendar.cachedIcs, fetchedAt: calendar.cachedAt, stale: false, error: null };
  }

  try {
    const ics = await downloadIcs(calendar.sourceUrl, fetchImpl);
    const fetchedAt = new Date();
    await db
      .update(calendars)
      .set({ cachedIcs: ics, cachedAt: fetchedAt, lastError: null, lastErrorAt: null })
      .where(eq(calendars.id, calendar.id));
    Object.assign(calendar, { cachedIcs: ics, cachedAt: fetchedAt, lastError: null, lastErrorAt: null });
    return { ics, fetchedAt, stale: false, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const lastErrorAt = new Date();
    await db.update(calendars).set({ lastError: message, lastErrorAt }).where(eq(calendars.id, calendar.id));
    Object.assign(calendar, { lastError: message, lastErrorAt });
    if (calendar.cachedIcs && calendar.cachedAt) {
      return { ics: calendar.cachedIcs, fetchedAt: calendar.cachedAt, stale: true, error: message };
    }
    throw err;
  }
}
