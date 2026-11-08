import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import type { AppEnv, Deps } from "./context";
import { canonicalOrigin } from "./lib/canonical";
import { sessionMiddleware } from "./lib/session";
import { authRoutes } from "./routes/auth";
import { calendarRoutes } from "./routes/calendars";
import { feedRoutes } from "./routes/feed";

export function createApp(deps: Deps) {
  const app = new Hono<AppEnv>();

  app.use("*", canonicalOrigin);
  app.use("*", async (c, next) => {
    c.set("deps", deps);
    c.set("db", deps.getDb(c.env));
    await next();
  });

  app.route("/feed", feedRoutes);

  const api = new Hono<AppEnv>();
  api.use("*", secureHeaders(), csrf(), sessionMiddleware);
  api.route("/auth", authRoutes);
  api.route("/calendars", calendarRoutes);
  api.all("*", (c) => c.json({ error: "Not found" }, 404));
  app.route("/api", api);

  // Everything else is the React app, served from static assets.
  app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status);
    }
    console.error(err);
    return c.json({ error: "Erreur interne" }, 500);
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
