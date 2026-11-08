import { and, eq, gt, lt, notExists } from "drizzle-orm";
import type { Database } from "../db/client";
import { calendars, sessions, users } from "../db/schema";

/** Accounts unused for this long are deleted, as stated in the privacy policy. */
export const INACTIVE_ACCOUNT_MS = 2 * 365 * 24 * 3600_000;

/**
 * Data retention: drops expired sessions, and accounts that nobody logged into
 * and whose calendars nobody fetched for two years.
 */
export async function purgeExpiredData(db: Database, now = new Date()) {
  const expiredSessions = await db.delete(sessions).where(lt(sessions.expiresAt, now)).returning({ id: sessions.id });

  const threshold = new Date(now.getTime() - INACTIVE_ACCOUNT_MS);
  const stillServed = db
    .select({ id: calendars.id })
    .from(calendars)
    .where(and(eq(calendars.userId, users.id), gt(calendars.lastServedAt, threshold)));

  const inactiveUsers = await db
    .delete(users)
    .where(and(lt(users.lastSeenAt, threshold), notExists(stillServed)))
    .returning({ id: users.id });

  return { sessions: expiredSessions.length, users: inactiveUsers.length };
}
