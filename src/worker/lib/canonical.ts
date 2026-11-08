import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../context";

/**
 * When APP_URL is set, every request is served from that origin: plain HTTP and
 * other hostnames (e.g. *.workers.dev) are redirected, so subscription links
 * built from the page origin always use the public URL.
 */
export const canonicalOrigin = createMiddleware<AppEnv>(async (c, next) => {
  const appUrl = c.env?.APP_URL;
  if (!appUrl) return next();

  const target = new URL(appUrl);
  const url = new URL(c.req.url);
  if (url.origin !== target.origin) {
    const location = `${target.origin}${url.pathname}${url.search}`;
    const safe = c.req.method === "GET" || c.req.method === "HEAD";
    return c.redirect(location, safe ? 301 : 308);
  }

  await next();
  if (target.protocol === "https:") {
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
});
