import { eq, ne } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { calendars, sessions, users } from "../../src/worker/db/schema";
import { INACTIVE_ACCOUNT_MS, purgeExpiredData } from "../../src/worker/lib/maintenance";
import { setup } from "./helpers";
import { ade } from "../fixtures";

type Ctx = Awaited<ReturnType<typeof setup>>;

async function registered(ctx: Ctx, email = "etu@example.com") {
  const res = await ctx.request("POST", "/api/auth/register", { email, password: "motdepasse", acceptTerms: true });
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
      (
        await ctx.request("POST", "/api/auth/login", {
          email: "etu@example.com",
          password: "motdepasse",
          acceptTerms: true,
        })
      ).status,
    ).toBe(200);
    expect((await ctx.request("GET", "/api/auth/me")).data.user.email).toBe("etu@example.com");
  });

  it("rejects duplicate accounts and weak passwords", async () => {
    await registered(ctx);
    ctx.clearCookie();
    expect(
      (
        await ctx.request("POST", "/api/auth/register", {
          email: "etu@example.com",
          password: "motdepasse",
          acceptTerms: true,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await ctx.request("POST", "/api/auth/register", {
          email: "x@example.com",
          password: "court",
          acceptTerms: true,
        })
      ).status,
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

  it("builds customised feeds end to end", async () => {
    const calendar = await createCalendar();
    expect(calendar.sourceUrl).toBe("https://ade.example.com/cal.ics");
    expect(calendar.settings.colorMode).toBe("course");

    const events = await ctx.request("GET", `/api/calendars/${calendar.id}/events`);
    expect(events.data.events).toHaveLength(7);
    expect(events.data.events[0]).toMatchObject({ key: "HAI101I", courseName: "Algorithmique 1", type: "CM" });

    const settings = {
      ...calendar.settings,
      hideKeywords: ["mentorat"],
      courses: { HAI101I: { name: "Algo", color: "#3366ff" }, SPORT: { hidden: true } },
    };
    const saved = await ctx.request("PUT", `/api/calendars/${calendar.id}/settings`, settings);
    expect(saved.status).toBe(200);
    expect(saved.data.calendar.settings.courses.HAI101I.name).toBe("Algo");

    const all = await ctx.request("GET", `/feed/${calendar.feedToken}.ics`);
    expect(all.status).toBe(200);
    expect(all.data).toContain("SUMMARY:Algo · TD");
    expect(all.data).toContain("LOCATION:Salle info 36.204");
    expect(all.data).toContain("SUMMARY:EXAMEN · Bases des mathématiques pour l'informatique");
    expect(all.data).not.toContain("Mentorat");
    expect(all.data).not.toContain("SPORT");

    const algo = await ctx.request("GET", `/feed/${calendar.feedToken}/hai101i.ics`);
    expect(algo.data).toContain("X-WR-CALNAME:Algo");
    expect(algo.data).toContain("X-APPLE-CALENDAR-COLOR:#3366FF");
    expect(algo.data).not.toContain("Programmation");

    const exams = await ctx.request("GET", `/feed/${calendar.feedToken}/examens.ics`);
    expect(exams.data).toContain("TRIGGER:-P1D");

    expect((await ctx.request("GET", `/feed/${calendar.feedToken}/inconnu.ics`)).status).toBe(404);
  });

  it("validates settings", async () => {
    const calendar = await createCalendar();
    const res = await ctx.request("PUT", `/api/calendars/${calendar.id}/settings`, {
      ...calendar.settings,
      colorMode: "rainbow",
    });
    expect(res.status).toBe(400);
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

describe("personal data", () => {
  it("requires accepting the terms", async () => {
    const ctx = await setup(ade);
    const res = await ctx.request("POST", "/api/auth/register", { email: "a@example.com", password: "motdepasse" });
    expect(res.status).toBe(400);
  });

  it("exports everything stored about the user", async () => {
    const ctx = await setup(ade);
    await registered(ctx);
    await ctx.request("POST", "/api/calendars", { name: "Fac", sourceUrl: "https://ade.example.com/cal.ics" });
    const res = await ctx.request("GET", "/api/auth/me/export");
    const data = res.data;
    expect(res.status).toBe(200);
    expect(data.account.email).toBe("etu@example.com");
    expect(data.calendars).toHaveLength(1);
    expect(data.calendars[0]).toMatchObject({ name: "Fac", sourceUrl: "https://ade.example.com/cal.ics" });
    expect(JSON.stringify(data)).not.toContain("pbkdf2");
  });

  it("deletes expired sessions and abandoned accounts", async () => {
    const ctx = await setup(ade);
    await registered(ctx, "ancien@example.com");
    await registered(ctx, "abonne@example.com");
    await registered(ctx, "actif@example.com");
    const old = new Date(Date.now() - INACTIVE_ACCOUNT_MS - 86_400_000);
    await ctx.db.update(users).set({ lastSeenAt: old }).where(ne(users.email, "actif@example.com"));
    await ctx.db.update(sessions).set({ expiresAt: old });

    // A calendar still fetched by a calendar app keeps its account alive.
    const [subscriber] = await ctx.db.select().from(users).where(eq(users.email, "abonne@example.com"));
    await ctx.db.insert(calendars).values({
      userId: subscriber!.id,
      name: "Fac",
      sourceUrl: "https://ade.example.com/cal.ics",
      feedToken: "token",
      lastServedAt: new Date(),
    });

    expect(await purgeExpiredData(ctx.db)).toEqual({ sessions: 3, users: 1 });
    const left = await ctx.db.select({ email: users.email }).from(users);
    expect(left.map((u) => u.email).sort()).toEqual(["abonne@example.com", "actif@example.com"]);
  });

  it("rate limits login attempts", async () => {
    const ctx = await setup(ade);
    let calls = 0;
    const env = { ...ctx.env, AUTH_LIMITER: { limit: async () => ({ success: ++calls <= 2 }) } };
    const login = () =>
      ctx.app.request(
        "http://localhost/api/auth/login",
        {
          method: "POST",
          headers: { Origin: "http://localhost", "Content-Type": "application/json" },
          body: JSON.stringify({ email: "x@example.com", password: "motdepasse" }),
        },
        env,
      );
    expect((await login()).status).toBe(401);
    expect((await login()).status).toBe(401);
    expect((await login()).status).toBe(429);
  });
});
