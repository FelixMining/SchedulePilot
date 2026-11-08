import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { readEvents } from "../../shared/calendar";
import { resolveSettings } from "../../shared/settings";
import { parseBody, requireUser, type AppContext, type AppEnv } from "../context";
import { calendars, type CalendarRow } from "../db/schema";
import { randomToken } from "../lib/crypto";
import { settingsSchema } from "../lib/settings";
import { downloadIcs, loadSource, normalizeSourceUrl, SourceError } from "../lib/source";

const uuid = z.uuid();
const MAX_CALENDARS = 10;

const calendarInput = z.object({
  name: z.string().trim().min(1, "Nom requis").max(80),
  sourceUrl: z.string().trim().min(1, "URL requise").max(2000),
});

async function ownedCalendar(c: AppContext): Promise<CalendarRow> {
  const user = requireUser(c);
  const id = uuid.safeParse(c.req.param("id"));
  if (!id.success) throw new HTTPException(404, { message: "Calendrier introuvable" });
  const [calendar] = await c
    .get("db")
    .select()
    .from(calendars)
    .where(and(eq(calendars.id, id.data), eq(calendars.userId, user.id)))
    .limit(1);
  if (!calendar) throw new HTTPException(404, { message: "Calendrier introuvable" });
  return calendar;
}

async function source(c: AppContext, calendar: CalendarRow, force = false) {
  try {
    return await loadSource(c.get("db"), calendar, { force, fetchImpl: c.get("deps").fetch });
  } catch (err) {
    if (err instanceof SourceError) throw new HTTPException(502, { message: err.message });
    throw err;
  }
}

async function fetchValidated(c: AppContext, rawUrl: string) {
  try {
    const sourceUrl = normalizeSourceUrl(rawUrl);
    return { sourceUrl, ics: await downloadIcs(sourceUrl, c.get("deps").fetch) };
  } catch (err) {
    if (err instanceof SourceError) throw new HTTPException(400, { message: err.message });
    throw err;
  }
}

function serializeCalendar(calendar: CalendarRow) {
  return {
    id: calendar.id,
    name: calendar.name,
    sourceUrl: calendar.sourceUrl,
    feedToken: calendar.feedToken,
    settings: resolveSettings(calendar.settings),
    cachedAt: calendar.cachedAt,
    lastError: calendar.lastError,
    lastErrorAt: calendar.lastErrorAt,
    lastServedAt: calendar.lastServedAt,
    createdAt: calendar.createdAt,
  };
}

export const calendarRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const user = requireUser(c);
    const rows = await c
      .get("db")
      .select()
      .from(calendars)
      .where(eq(calendars.userId, user.id))
      .orderBy(asc(calendars.createdAt));
    return c.json({ calendars: rows.map(serializeCalendar) });
  })

  .post("/", async (c) => {
    const user = requireUser(c);
    const input = await parseBody(c, calendarInput);
    const db = c.get("db");

    const owned = await db.select({ id: calendars.id }).from(calendars).where(eq(calendars.userId, user.id));
    if (owned.length >= MAX_CALENDARS) {
      throw new HTTPException(400, { message: `Limite de ${MAX_CALENDARS} calendriers atteinte` });
    }

    const { sourceUrl, ics } = await fetchValidated(c, input.sourceUrl);
    const [calendar] = await db
      .insert(calendars)
      .values({
        userId: user.id,
        name: input.name,
        sourceUrl,
        feedToken: randomToken(24),
        cachedIcs: ics,
        cachedAt: new Date(),
      })
      .returning();
    return c.json({ calendar: serializeCalendar(calendar!) }, 201);
  })

  .get("/:id", async (c) => {
    const calendar = await ownedCalendar(c);
    return c.json({ calendar: serializeCalendar(calendar) });
  })

  .patch("/:id", async (c) => {
    const calendar = await ownedCalendar(c);
    const input = await parseBody(c, calendarInput.partial());
    const patch: Partial<CalendarRow> = {};
    if (input.name !== undefined) patch.name = input.name;

    if (input.sourceUrl !== undefined && normalizeSourceUrl(input.sourceUrl) !== calendar.sourceUrl) {
      const { sourceUrl, ics } = await fetchValidated(c, input.sourceUrl);
      Object.assign(patch, { sourceUrl, cachedIcs: ics, cachedAt: new Date(), lastError: null, lastErrorAt: null });
    }

    if (Object.keys(patch).length === 0) return c.json({ calendar: serializeCalendar(calendar) });
    const [updated] = await c.get("db").update(calendars).set(patch).where(eq(calendars.id, calendar.id)).returning();
    return c.json({ calendar: serializeCalendar(updated!) });
  })

  .put("/:id/settings", async (c) => {
    const calendar = await ownedCalendar(c);
    const settings = await parseBody(c, settingsSchema);
    const [updated] = await c
      .get("db")
      .update(calendars)
      .set({ settings })
      .where(eq(calendars.id, calendar.id))
      .returning();
    return c.json({ calendar: serializeCalendar(updated!) });
  })

  .delete("/:id", async (c) => {
    const calendar = await ownedCalendar(c);
    await c.get("db").delete(calendars).where(eq(calendars.id, calendar.id));
    return c.body(null, 204);
  })

  .post("/:id/rotate-token", async (c) => {
    const calendar = await ownedCalendar(c);
    const [updated] = await c
      .get("db")
      .update(calendars)
      .set({ feedToken: randomToken(24) })
      .where(eq(calendars.id, calendar.id))
      .returning();
    return c.json({ calendar: serializeCalendar(updated!) });
  })

  .post("/:id/refresh", async (c) => {
    const calendar = await ownedCalendar(c);
    const result = await source(c, calendar, true);
    return c.json({ calendar: serializeCalendar(calendar), stale: result.stale, error: result.error });
  })

  // Parsed events: the UI applies the settings itself, so edits preview instantly.
  .get("/:id/events", async (c) => {
    const calendar = await ownedCalendar(c);
    const { ics, stale, error, fetchedAt } = await source(c, calendar);
    return c.json({ events: readEvents(ics), stale, error, fetchedAt });
  });
