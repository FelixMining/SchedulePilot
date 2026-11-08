import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod";
import type { Database } from "./db/client";
import type { UserRow } from "./db/schema";

export interface Deps {
  getDb: (env: Env) => Database;
  fetch?: typeof fetch;
}

export type AppEnv = {
  Bindings: Env;
  Variables: {
    db: Database;
    deps: Deps;
    user: UserRow | null;
  };
};

export type AppContext = Context<AppEnv>;

export function requireUser(c: AppContext): UserRow {
  const user = c.get("user");
  if (!user) throw new HTTPException(401, { message: "Non connecté" });
  return user;
}

export async function parseBody<T extends z.ZodType>(c: AppContext, schema: T): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: "Corps de requête JSON invalide" });
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new HTTPException(400, { message: issue?.message ?? "Données invalides" });
  }
  return result.data;
}
