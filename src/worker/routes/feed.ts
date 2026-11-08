import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { buildFeed, type FeedFilter } from "../../shared/calendar";
import type { AppContext, AppEnv } from "../context";
import { calendars, groups } from "../db/schema";
import { loadRules } from "../lib/rules";
import { loadSource } from "../lib/source";

const notFound = (c: AppContext) => c.text("Not found", 404);
const stripExt = (s: string) => s.replace(/\.ics$/i, "");

/**
 * Public subscription URLs:
 *   /feed/<token>.ics            every visible event
 *   /feed/<token>/ungrouped.ics  events not assigned to a group
 *   /feed/<token>/<group>.ics    events of one group
 *
 * The token is the only secret, so it is long and can be rotated from the UI.
 */
async function serveFeed(c: AppContext, token: string, groupParam: string | null) {
  const db = c.get("db");
  const [calendar] = await db.select().from(calendars).where(eq(calendars.feedToken, token)).limit(1);
  if (!calendar) return notFound(c);

  let filter: FeedFilter = { kind: "all" };
  let name = calendar.name;
  let color = calendar.color;

  if (groupParam === "ungrouped") {
    filter = { kind: "ungrouped" };
    name = `${calendar.name} · Autres`;
  } else if (groupParam) {
    const groupList = await db.select().from(groups).where(eq(groups.calendarId, calendar.id));
    const group = groupList.find((g) => g.id === groupParam);
    if (!group) return notFound(c);
    filter = { kind: "group", groupId: group.id };
    name = `${calendar.name} · ${group.name}`;
    color = group.color;
  }

  let ics: string;
  try {
    ({ ics } = await loadSource(db, calendar, { fetchImpl: c.get("deps").fetch }));
  } catch {
    return c.text("Upstream calendar unavailable", 502);
  }

  const body = buildFeed(ics, await loadRules(db, calendar.id), { name, color, filter });

  const touch = db.update(calendars).set({ lastServedAt: new Date() }).where(eq(calendars.id, calendar.id));
  try {
    c.executionCtx.waitUntil(touch);
  } catch {
    await touch; // no execution context (tests)
  }

  return c.body(body, 200, {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": `inline; filename="${stripExt(groupParam ?? "calendar")}.ics"`,
    "Cache-Control": "private, max-age=300",
  });
}

export const feedRoutes = new Hono<AppEnv>()
  .get("/:file", (c) => serveFeed(c, stripExt(c.req.param("file")), null))
  .get("/:token/:file", (c) => serveFeed(c, c.req.param("token"), stripExt(c.req.param("file"))));
