import { and, asc, gt, isNotNull, lt, or, isNull } from "drizzle-orm";
import { createApp } from "./app";
import { createNeonDb } from "./db/client";
import { calendars } from "./db/schema";
import { purgeExpiredData } from "./lib/maintenance";
import { CACHE_TTL_MS, loadSource } from "./lib/source";

const app = createApp({ getDb: (env) => createNeonDb(env.DATABASE_URL) });

const ACTIVE_WINDOW_MS = 7 * 24 * 3600_000;
const REFRESH_BATCH = 25;

/**
 * Pre-warms the cache of calendars that are actually subscribed somewhere, so
 * that Apple Calendar never has to wait for the university server.
 */
async function refreshActiveCalendars(env: Env) {
  const db = createNeonDb(env.DATABASE_URL);
  const now = Date.now();
  const due = await db
    .select()
    .from(calendars)
    .where(
      and(
        isNotNull(calendars.lastServedAt),
        gt(calendars.lastServedAt, new Date(now - ACTIVE_WINDOW_MS)),
        or(isNull(calendars.cachedAt), lt(calendars.cachedAt, new Date(now - CACHE_TTL_MS))),
      ),
    )
    .orderBy(asc(calendars.cachedAt))
    .limit(REFRESH_BATCH);

  const results = await Promise.allSettled(due.map((calendar) => loadSource(db, calendar, { force: true })));
  const failed = results.filter((r) => r.status === "rejected").length;
  console.log(`refreshed ${due.length - failed}/${due.length} calendars`);
}

export default {
  fetch: app.fetch,
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(refreshActiveCalendars(env));
    // Retention rules run once a day, on the first trigger after 3am UTC.
    const at = new Date(controller.scheduledTime);
    if (at.getUTCHours() === 3 && at.getUTCMinutes() < 20) {
      ctx.waitUntil(purgeExpiredData(createNeonDb(env.DATABASE_URL)).then((r) => console.log("purged", r)));
    }
  },
} satisfies ExportedHandler<Env>;
