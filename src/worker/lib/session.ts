import { and, eq, gt } from "drizzle-orm";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { AppContext, AppEnv } from "../context";
import { sessions, users } from "../db/schema";
import { randomToken, sha256 } from "./crypto";

const COOKIE = "sp_session";
const SESSION_DAYS = 30;
const DAY_MS = 24 * 3600_000;

function cookieOptions(c: AppContext, expires?: Date) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "Lax" as const,
    secure: new URL(c.req.url).protocol === "https:",
    expires,
  };
}

export async function startSession(c: AppContext, userId: string): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);
  const id = await sha256(token);
  const db = c.get("db");
  await db.insert(sessions).values({ id, userId, expiresAt });
  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, userId));
  setCookie(c, COOKIE, token, cookieOptions(c, expiresAt));
}

export async function endSession(c: AppContext): Promise<void> {
  const token = getCookie(c, COOKIE);
  if (token) {
    const id = await sha256(token);
    await c.get("db").delete(sessions).where(eq(sessions.id, id));
  }
  deleteCookie(c, COOKIE, cookieOptions(c));
}

/** Loads the current user from the session cookie, sliding the expiry when it gets close. */
export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set("user", null);
  const token = getCookie(c, COOKIE);
  if (!token) return next();

  const db = c.get("db");
  const id = await sha256(token);
  const [row] = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!row) {
    deleteCookie(c, COOKIE, cookieOptions(c));
    return next();
  }

  if (row.expiresAt.getTime() - Date.now() < (SESSION_DAYS / 2) * DAY_MS) {
    const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
    await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, row.user.id));
    setCookie(c, COOKIE, token, cookieOptions(c, expiresAt));
  }

  c.set("user", row.user);
  return next();
});
