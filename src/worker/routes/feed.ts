import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { buildFeed, readEvents } from "../../shared/calendar";
import { buildProfile } from "../../shared/mobileconfig";
import { listFeeds } from "../../shared/render";
import { resolveSettings } from "../../shared/settings";
import type { AppContext, AppEnv } from "../context";
import { calendars, type CalendarRow } from "../db/schema";
import { loadSource } from "../lib/source";

const stripExt = (s: string) => s.replace(/\.(ics|mobileconfig)$/i, "");

async function load(c: AppContext, token: string) {
  const db = c.get("db");
  const [calendar] = await db.select().from(calendars).where(eq(calendars.feedToken, token)).limit(1);
  if (!calendar) return null;
  try {
    const { ics } = await loadSource(db, calendar, { fetchImpl: c.get("deps").fetch });
    return { calendar, ics, settings: resolveSettings(calendar.settings) };
  } catch {
    return { calendar, ics: null, settings: resolveSettings(calendar.settings) };
  }
}

async function touch(c: AppContext, calendar: CalendarRow) {
  const update = c.get("db").update(calendars).set({ lastServedAt: new Date() }).where(eq(calendars.id, calendar.id));
  try {
    c.executionCtx.waitUntil(update);
  } catch {
    await update; // no execution context (tests)
  }
}

const icsResponse = (c: AppContext, body: string, filename: string) =>
  c.body(body, 200, {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": `inline; filename="${filename}.ics"`,
    "Cache-Control": "private, max-age=300",
  });

/**
 * Public subscription URLs (the token is the only secret and can be rotated):
 *   /feed/<token>.ics                  every visible event, one calendar
 *   /feed/<token>/<calendar>.ics       one of the calendars listed by `listFeeds`
 *   /feed/<token>/apple.mobileconfig   Apple profile subscribing to all of them
 */
export const feedRoutes = new Hono<AppEnv>()
  .get("/:file", async (c) => {
    const data = await load(c, stripExt(c.req.param("file")));
    if (!data) return c.text("Not found", 404);
    if (!data.ics) return c.text("Upstream calendar unavailable", 502);
    await touch(c, data.calendar);
    const body = buildFeed(data.ics, data.settings, {
      name: data.calendar.name,
      color: data.settings.singleColor,
      feed: null,
    });
    return icsResponse(c, body, "calendar");
  })

  .get("/:token/:file", async (c) => {
    const data = await load(c, c.req.param("token"));
    if (!data) return c.text("Not found", 404);
    if (!data.ics) return c.text("Upstream calendar unavailable", 502);

    const feeds = listFeeds(readEvents(data.ics), data.settings);
    const file = c.req.param("file");

    if (file === "apple.mobileconfig") {
      const origin = new URL(c.req.url).origin;
      const token = data.calendar.feedToken;
      const profile = await buildProfile({
        identifier: `dev.schedulepilot.${token.slice(0, 12)}`,
        name: data.calendar.name,
        calendars: feeds.map((f) => ({ key: f.key, name: f.name, url: `${origin}/feed/${token}/${f.key}.ics` })),
      });
      return c.body(profile, 200, {
        "Content-Type": "application/x-apple-aspen-config",
        "Content-Disposition": `attachment; filename="schedulepilot.mobileconfig"`,
      });
    }

    const key = stripExt(file);
    const feed = feeds.find((f) => f.key === key);
    if (!feed) return c.text("Not found", 404);
    await touch(c, data.calendar);
    return icsResponse(c, buildFeed(data.ics, data.settings, { name: feed.name, color: feed.color, feed: key }), key);
  });
