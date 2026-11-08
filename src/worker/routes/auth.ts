import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { parseBody, requireUser, type AppEnv } from "../context";
import { sessions, users } from "../db/schema";
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

// Used to keep login timing similar whether or not the account exists.
const DUMMY_HASH = "pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export const authRoutes = new Hono<AppEnv>()
  .post("/register", async (c) => {
    const { email, password } = await parseBody(c, credentialsSchema);
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
