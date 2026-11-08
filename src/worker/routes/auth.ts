import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { resolveSettings } from "../../shared/settings";
import { parseBody, requireUser, type AppContext, type AppEnv } from "../context";
import { calendars, sessions, users } from "../db/schema";
import { hashPassword, verifyPassword } from "../lib/crypto";
import { endSession, startSession } from "../lib/session";

const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ message: "Adresse e-mail invalide" })),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères").max(200),
});

const registerSchema = credentialsSchema.extend({
  acceptTerms: z.literal(true, { message: "Vous devez accepter les conditions d'utilisation" }),
});

/** Slows down password guessing: a few attempts per minute and per IP address. */
async function rateLimit(c: AppContext, action: string) {
  const limiter = c.env?.AUTH_LIMITER;
  if (!limiter) return;
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const { success } = await limiter.limit({ key: `${action}:${ip}` });
  if (!success) throw new HTTPException(429, { message: "Trop de tentatives, réessayez dans une minute" });
}

// Used to keep login timing similar whether or not the account exists.
const DUMMY_HASH = "pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export const authRoutes = new Hono<AppEnv>()
  .post("/register", async (c) => {
    await rateLimit(c, "register");
    const { email, password } = await parseBody(c, registerSchema);
    const db = c.get("db");

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) throw new HTTPException(409, { message: "Un compte existe déjà avec cette adresse" });

    const [user] = await db
      .insert(users)
      .values({ email, passwordHash: await hashPassword(password) })
      .returning({ id: users.id, email: users.email });
    await startSession(c, user!.id);
    return c.json({ user }, 201);
  })

  .post("/login", async (c) => {
    await rateLimit(c, "login");
    const { email, password } = await parseBody(c, credentialsSchema);
    const [user] = await c.get("db").select().from(users).where(eq(users.email, email)).limit(1);

    const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) throw new HTTPException(401, { message: "E-mail ou mot de passe incorrect" });

    await startSession(c, user.id);
    return c.json({ user: { id: user.id, email: user.email } });
  })

  .post("/logout", async (c) => {
    await endSession(c);
    return c.body(null, 204);
  })

  .get("/me", (c) => {
    const user = c.get("user");
    return c.json({ user: user ? { id: user.id, email: user.email } : null });
  })

  .post("/password", async (c) => {
    const user = requireUser(c);
    const body = await parseBody(
      c,
      z.object({
        current: z.string(),
        next: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères").max(200),
      }),
    );
    if (!(await verifyPassword(body.current, user.passwordHash))) {
      throw new HTTPException(403, { message: "Mot de passe actuel incorrect" });
    }
    const db = c.get("db");
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(body.next) })
      .where(eq(users.id, user.id));
    await db.delete(sessions).where(eq(sessions.userId, user.id));
    await startSession(c, user.id);
    return c.body(null, 204);
  })

  // Right of access and portability (GDPR art. 15 and 20).
  .get("/me/export", async (c) => {
    const user = requireUser(c);
    const rows = await c
      .get("db")
      .select()
      .from(calendars)
      .where(eq(calendars.userId, user.id))
      .orderBy(asc(calendars.createdAt));
    const data = {
      exportedAt: new Date().toISOString(),
      account: { email: user.email, createdAt: user.createdAt, lastSeenAt: user.lastSeenAt },
      calendars: rows.map((cal) => ({
        name: cal.name,
        sourceUrl: cal.sourceUrl,
        settings: resolveSettings(cal.settings),
        createdAt: cal.createdAt,
        lastFetchedAt: cal.cachedAt,
        lastServedAt: cal.lastServedAt,
      })),
    };
    return c.body(JSON.stringify(data, null, 2), 200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="schedulepilot-export.json"',
    });
  })

  .delete("/me", async (c) => {
    const user = requireUser(c);
    const { password } = await parseBody(c, z.object({ password: z.string() }));
    if (!(await verifyPassword(password, user.passwordHash))) {
      throw new HTTPException(403, { message: "Mot de passe incorrect" });
    }
    await c.get("db").delete(users).where(eq(users.id, user.id));
    await endSession(c);
    return c.body(null, 204);
  });
