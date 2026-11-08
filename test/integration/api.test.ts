import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { calendars } from "../../src/worker/db/schema";
import { setup } from "./helpers";
import { ade } from "../fixtures";

type Ctx = Awaited<ReturnType<typeof setup>>;

async function registered(ctx: Ctx, email = "etu@example.com") {
  const res = await ctx.request("POST", "/api/auth/register", { email, password: "motdepasse" });
  expect(res.status).toBe(201);
  return res.data.user;
}

describe("auth", () => {
  let ctx: Ctx;
  beforeEach(async () => {
    ctx = await setup(ade);
  });

  it("registers, logs out and logs back in", async () => {
    await registered(ctx, "Etu@Example.com ");
    expect((await ctx.request("GET", "/api/auth/me")).data.user.email).toBe("etu@example.com");

    await ctx.request("POST", "/api/auth/logout");
    expect((await ctx.request("GET", "/api/auth/me")).data.user).toBeNull();

    expect(
      (await ctx.request("POST", "/api/auth/login", { email: "etu@example.com", password: "mauvais!!" })).status,
    ).toBe(401);
    expect(
      (await ctx.request("POST", "/api/auth/login", { email: "etu@example.com", password: "motdepasse" })).status,
    ).toBe(200);
    expect((await ctx.request("GET", "/api/auth/me")).data.user.email).toBe("etu@example.com");
  });

  it("rejects duplicate accounts and weak passwords", async () => {
    await registered(ctx);
    ctx.clearCookie();
    expect(
      (await ctx.request("POST", "/api/auth/register", { email: "etu@example.com", password: "motdepasse" })).status,
    ).toBe(409);
    expect(
      (await ctx.request("POST", "/api/auth/register", { email: "x@example.com", password: "court" })).status,
    ).toBe(400);
  });

  it("requires a session for the API", async () => {
    expect((await ctx.request("GET", "/api/calendars")).status).toBe(401);
  });
});

describe("calendars and feeds", () => {
  let ctx: Ctx;
  beforeEach(async () => {
    ctx = await setup(ade);
    await registered(ctx);
  });

  async function createCalendar() {
    const res = await ctx.request("POST", "/api/calendars", {
      name: "Fac",
      sourceUrl: "webcal://ade.example.com/cal.ics",
    });
    expect(res.status).toBe(201);
    return res.data.calendar;
  }

  it("validates the source when creating a calendar", async () => {
    ctx.upstream.body = "<html>nope</html>";
    const res = await ctx.request("POST", "/api/calendars", { name: "Fac", sourceUrl: "https://ade.example.com" });
    expect(res.status).toBe(400);
    expect(res.data.error).toMatch(/ICS/);
  });

  it("builds a customised feed end to end", async () => {
    const calendar = await createCalendar();
    expect(calendar.sourceUrl).toBe("https://ade.example.com/cal.ics");

    const courses = await ctx.request("GET", `/api/calendars/${calendar.id}/courses`);
    expect(courses.data.courses.map((c: any) => c.key)).toEqual(["HAI301I", "HAI302I", "Mentorat L3"]);

    const group = await ctx.request("POST", `/api/calendars/${calendar.id}/groups`, { name: "Algo", color: "#3366ff" });
    expect(group.status).toBe(201);

    await ctx.request("PUT", `/api/calendars/${calendar.id}/courses/HAI301I`, {
      title: "Algorithmique {type}",
      groupId: group.data.group.id,
    });
    await ctx.request("PUT", `/api/calendars/${calendar.id}/courses/${encodeURIComponent("Mentorat L3")}`, {
      hidden: true,
    });
    const rule = await ctx.request("POST", `/api/calendars/${calendar.id}/rules`, {
      name: "Description",
      conditions: [],
      actions: [{ type: "set_description", template: "{type} · {location}" }],
    });
    expect(rule.status).toBe(201);

    const all = await ctx.request("GET", `/feed/${calendar.feedToken}.ics`);
    expect(all.status).toBe(200);
    expect(all.data).toContain("SUMMARY:Algorithmique TD");
    expect(all.data).toContain("SUMMARY:HAI-302I Bases de données TP");
    expect(all.data).not.toContain("Mentorat");
    expect(all.data).toContain("DESCRIPTION:TP · TP 16.02");

    const algo = await ctx.request("GET", `/feed/${calendar.feedToken}/${group.data.group.id}.ics`);
    expect(algo.data).toContain("X-APPLE-CALENDAR-COLOR:#3366ff");
    expect(algo.data).not.toContain("Bases de données");

    const rest = await ctx.request("GET", `/feed/${calendar.feedToken}/ungrouped.ics`);
    expect(rest.data).toContain("Bases de données");
    expect(rest.data).not.toContain("Algorithmique");

    // Clearing the quick edit removes the managed rule.
    await ctx.request("PUT", `/api/calendars/${calendar.id}/courses/HAI301I`, { title: "" });
    const detail = await ctx.request("GET", `/api/calendars/${calendar.id}`);
    expect(detail.data.rules.map((r: any) => r.courseKey)).toEqual(["Mentorat L3", null]);
  });

  it("serves the cached copy when upstream is down", async () => {
    const calendar = await createCalendar();
    await ctx.db
      .update(calendars)
      .set({ cachedAt: new Date(0) })
      .where(eq(calendars.id, calendar.id));
    ctx.upstream.status = 500;

    const feed = await ctx.request("GET", `/feed/${calendar.feedToken}.ics`);
    expect(feed.status).toBe(200);
    expect(feed.data).toContain("BEGIN:VEVENT");

    const detail = await ctx.request("GET", `/api/calendars/${calendar.id}`);
    expect(detail.data.calendar.lastError).toMatch(/500/);
  });

  it("does not hit upstream while the cache is fresh", async () => {
    const calendar = await createCalendar();
    const before = ctx.upstream.calls;
    await ctx.request("GET", `/feed/${calendar.feedToken}.ics`);
    await ctx.request("GET", `/feed/${calendar.feedToken}.ics`);
    expect(ctx.upstream.calls).toBe(before);
  });

  it("removes group references when a group is deleted", async () => {
    const calendar = await createCalendar();
    const group = (await ctx.request("POST", `/api/calendars/${calendar.id}/groups`, { name: "G", color: "#000000" }))
      .data.group;
    await ctx.request("PUT", `/api/calendars/${calendar.id}/courses/HAI302I`, { title: "BDD", groupId: group.id });
    expect((await ctx.request("DELETE", `/api/calendars/${calendar.id}/groups/${group.id}`)).status).toBe(204);

    const detail = await ctx.request("GET", `/api/calendars/${calendar.id}`);
    expect(detail.data.rules[0].actions).toEqual([{ type: "set_title", template: "BDD" }]);
  });

  it("rotates the feed token", async () => {
    const calendar = await createCalendar();
    const rotated = await ctx.request("POST", `/api/calendars/${calendar.id}/rotate-token`);
    expect(rotated.data.calendar.feedToken).not.toBe(calendar.feedToken);
    expect((await ctx.request("GET", `/feed/${calendar.feedToken}.ics`)).status).toBe(404);
    expect((await ctx.request("GET", `/feed/${rotated.data.calendar.feedToken}.ics`)).status).toBe(200);
  });

  it("isolates users from each other", async () => {
    const calendar = await createCalendar();
    ctx.clearCookie();
    await registered(ctx, "autre@example.com");
    expect((await ctx.request("GET", `/api/calendars/${calendar.id}`)).status).toBe(404);
    expect((await ctx.request("DELETE", `/api/calendars/${calendar.id}`)).status).toBe(404);
    expect((await ctx.request("GET", "/api/calendars")).data.calendars).toEqual([]);
  });

  it("rejects invalid rules", async () => {
    const calendar = await createCalendar();
    const res = await ctx.request("POST", `/api/calendars/${calendar.id}/rules`, {
      conditions: [{ field: "summary", operator: "regex", value: "(" }],
      actions: [{ type: "hide" }],
    });
    expect(res.status).toBe(400);
  });

  it("blocks cross-site form posts", async () => {
    const res = await ctx.app.request(
      "http://localhost/api/auth/logout",
      {
        method: "POST",
        headers: { Origin: "https://evil.example", "Content-Type": "application/x-www-form-urlencoded" },
      },
      ctx.env,
    );
    expect(res.status).toBe(403);
  });
});

describe("canonical origin", () => {
  it("redirects other hosts and plain http to APP_URL", async () => {
    const ctx = await setup(ade);
    const env = { ...ctx.env, APP_URL: "https://schedule.example.com" };

    const http = await ctx.app.request("http://schedule.example.com/feed/abc.ics?x=1", {}, env);
    expect(http.status).toBe(301);
    expect(http.headers.get("location")).toBe("https://schedule.example.com/feed/abc.ics?x=1");

    const other = await ctx.app.request("https://foo.workers.dev/app", { method: "POST" }, env);
    expect(other.status).toBe(308);
    expect(other.headers.get("location")).toBe("https://schedule.example.com/app");

    const ok = await ctx.app.request("https://schedule.example.com/api/auth/me", {}, env);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("strict-transport-security")).toContain("max-age");
  });

  it("keeps the port of APP_URL", async () => {
    const ctx = await setup(ade);
    const env = { ...ctx.env, APP_URL: "http://localhost:4173" };
    const res = await ctx.app.request("http://127.0.0.1:8080/login?a=b", {}, env);
    expect(res.headers.get("location")).toBe("http://localhost:4173/login?a=b");
  });
});

describe("static assets", () => {
  it("serves the React app for every other path", async () => {
    const ctx = await setup(ade);
    const assets = { fetch: async (req: Request) => new Response(`asset ${new URL(req.url).pathname}`) };
    const res = await ctx.app.request("http://localhost/app/calendars/x", {}, { ...ctx.env, ASSETS: assets });
    expect(await res.text()).toBe("asset /app/calendars/x");
  });
});
