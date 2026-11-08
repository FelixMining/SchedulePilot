import { and, asc, eq, max } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { previewEvents, summarizeCourses } from "../../shared/calendar";
import { applyRules, ruleInputSchema, type Action } from "../../shared/rules";
import { parseBody, requireUser, type AppContext, type AppEnv } from "../context";
import { calendars, groups, rules, type CalendarRow, type GroupRow } from "../db/schema";
import { randomToken } from "../lib/crypto";
import { courseCondition, loadRules, toRule } from "../lib/rules";
import { downloadIcs, loadSource, normalizeSourceUrl, SourceError } from "../lib/source";

const uuid = z.uuid();
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide");
const MAX_CALENDARS = 10;
const MAX_RULES = 300;

const calendarInput = z.object({
  name: z.string().trim().min(1, "Nom requis").max(80),
  sourceUrl: z.string().trim().min(1, "URL requise").max(2000),
  color: color.nullable().optional(),
});

const groupInput = z.object({
  name: z.string().trim().min(1, "Nom requis").max(60),
  color,
});

const courseInput = z.object({
  title: z.string().max(500).default(""),
  hidden: z.boolean().default(false),
  groupId: uuid.nullable().default(null),
});

function idParam(c: AppContext, name: string): string {
  const id = uuid.safeParse(c.req.param(name));
  if (!id.success) throw new HTTPException(404, { message: "Ressource introuvable" });
  return id.data;
}

async function ownedCalendar(c: AppContext): Promise<CalendarRow> {
  const user = requireUser(c);
  const id = idParam(c, "id");
  const [calendar] = await c
    .get("db")
    .select()
    .from(calendars)
    .where(and(eq(calendars.id, id), eq(calendars.userId, user.id)))
    .limit(1);
  if (!calendar) throw new HTTPException(404, { message: "Calendrier introuvable" });
  return calendar;
}

async function source(c: AppContext, calendar: CalendarRow, force = false) {
  try {
    return await loadSource(c.get("db"), calendar, { force, fetchImpl: c.get("deps").fetch });
  } catch (err) {
    if (err instanceof SourceError) throw new HTTPException(502, { message: err.message });
    throw err;
  }
}

function loadGroups(c: AppContext, calendarId: string): Promise<GroupRow[]> {
  return c
    .get("db")
    .select()
    .from(groups)
    .where(eq(groups.calendarId, calendarId))
    .orderBy(asc(groups.position), asc(groups.createdAt));
}

async function nextRulePosition(c: AppContext, calendarId: string): Promise<number> {
  const [row] = await c
    .get("db")
    .select({ max: max(rules.position) })
    .from(rules)
    .where(eq(rules.calendarId, calendarId));
  return (row?.max ?? -1) + 1;
}

async function assertGroup(c: AppContext, calendarId: string, groupId: string | null | undefined) {
  if (!groupId) return;
  const [group] = await c
    .get("db")
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.calendarId, calendarId)))
    .limit(1);
  if (!group) throw new HTTPException(400, { message: "Groupe inconnu" });
}

async function assertRuleGroups(c: AppContext, calendarId: string, actions: Action[]) {
  for (const action of actions) {
    if (action.type === "set_group") await assertGroup(c, calendarId, action.groupId);
  }
}

function serializeCalendar(calendar: CalendarRow) {
  return {
    id: calendar.id,
    name: calendar.name,
    sourceUrl: calendar.sourceUrl,
    color: calendar.color,
    feedToken: calendar.feedToken,
    cachedAt: calendar.cachedAt,
    lastError: calendar.lastError,
    lastErrorAt: calendar.lastErrorAt,
    lastServedAt: calendar.lastServedAt,
    createdAt: calendar.createdAt,
  };
}

export const calendarRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const user = requireUser(c);
    const rows = await c
      .get("db")
      .select()
      .from(calendars)
      .where(eq(calendars.userId, user.id))
      .orderBy(asc(calendars.createdAt));
    return c.json({ calendars: rows.map(serializeCalendar) });
  })

  .post("/", async (c) => {
    const user = requireUser(c);
    const input = await parseBody(c, calendarInput);
    const db = c.get("db");

    const owned = await db.select({ id: calendars.id }).from(calendars).where(eq(calendars.userId, user.id));
    if (owned.length >= MAX_CALENDARS) {
      throw new HTTPException(400, { message: `Limite de ${MAX_CALENDARS} calendriers atteinte` });
    }

    let sourceUrl: string;
    let ics: string;
    try {
      sourceUrl = normalizeSourceUrl(input.sourceUrl);
      ics = await downloadIcs(sourceUrl, c.get("deps").fetch);
    } catch (err) {
      if (err instanceof SourceError) throw new HTTPException(400, { message: err.message });
      throw err;
    }

    const [calendar] = await db
      .insert(calendars)
      .values({
        userId: user.id,
        name: input.name,
        sourceUrl,
        color: input.color ?? null,
        feedToken: randomToken(24),
        cachedIcs: ics,
        cachedAt: new Date(),
      })
      .returning();
    return c.json({ calendar: serializeCalendar(calendar!) }, 201);
  })

  .get("/:id", async (c) => {
    const calendar = await ownedCalendar(c);
    const [groupRows, ruleList] = await Promise.all([loadGroups(c, calendar.id), loadRules(c.get("db"), calendar.id)]);
    return c.json({ calendar: serializeCalendar(calendar), groups: groupRows, rules: ruleList });
  })

  .patch("/:id", async (c) => {
    const calendar = await ownedCalendar(c);
    const input = await parseBody(c, calendarInput.partial());
    const patch: Partial<CalendarRow> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.color !== undefined) patch.color = input.color;

    if (input.sourceUrl !== undefined) {
      try {
        const sourceUrl = normalizeSourceUrl(input.sourceUrl);
        if (sourceUrl !== calendar.sourceUrl) {
          patch.sourceUrl = sourceUrl;
          patch.cachedIcs = await downloadIcs(sourceUrl, c.get("deps").fetch);
          patch.cachedAt = new Date();
          patch.lastError = null;
          patch.lastErrorAt = null;
        }
      } catch (err) {
        if (err instanceof SourceError) throw new HTTPException(400, { message: err.message });
        throw err;
      }
    }

    if (Object.keys(patch).length === 0) return c.json({ calendar: serializeCalendar(calendar) });
    const [updated] = await c.get("db").update(calendars).set(patch).where(eq(calendars.id, calendar.id)).returning();
    return c.json({ calendar: serializeCalendar(updated!) });
  })

  .delete("/:id", async (c) => {
    const calendar = await ownedCalendar(c);
    await c.get("db").delete(calendars).where(eq(calendars.id, calendar.id));
    return c.body(null, 204);
  })

  .post("/:id/rotate-token", async (c) => {
    const calendar = await ownedCalendar(c);
    const [updated] = await c
      .get("db")
      .update(calendars)
      .set({ feedToken: randomToken(24) })
      .where(eq(calendars.id, calendar.id))
      .returning();
    return c.json({ calendar: serializeCalendar(updated!) });
  })

  .post("/:id/refresh", async (c) => {
    const calendar = await ownedCalendar(c);
    const result = await source(c, calendar, true);
    return c.json({ calendar: serializeCalendar(calendar), stale: result.stale, error: result.error });
  })

  .get("/:id/preview", async (c) => {
    const calendar = await ownedCalendar(c);
    const [{ ics, stale, error }, ruleList] = await Promise.all([
      source(c, calendar),
      loadRules(c.get("db"), calendar.id),
    ]);
    const limit = Math.min(Number(c.req.query("limit")) || 150, 500);
    return c.json({ events: previewEvents(ics, ruleList, { limit }), stale, error });
  })

  .get("/:id/courses", async (c) => {
    const calendar = await ownedCalendar(c);
    const [{ ics }, ruleList] = await Promise.all([source(c, calendar), loadRules(c.get("db"), calendar.id)]);

    const courses = summarizeCourses(ics).map((course) => {
      const rule = ruleList.find((r) => r.courseKey === course.key) ?? null;
      const result = applyRules(ruleList, { summary: course.sample, description: "", location: "" });
      return { ...course, rule, preview: result };
    });
    return c.json({ courses });
  })

  // Quick editing from the "courses" view: one managed rule per course.
  .put("/:id/courses/:key", async (c) => {
    const calendar = await ownedCalendar(c);
    const key = decodeURIComponent(c.req.param("key")).slice(0, 200);
    const input = await parseBody(c, courseInput);
    await assertGroup(c, calendar.id, input.groupId);
    const db = c.get("db");

    const actions: Action[] = [];
    if (input.hidden) actions.push({ type: "hide" });
    else {
      if (input.title.trim()) actions.push({ type: "set_title", template: input.title.trim() });
      if (input.groupId) actions.push({ type: "set_group", groupId: input.groupId });
    }

    const [existing] = await db
      .select()
      .from(rules)
      .where(and(eq(rules.calendarId, calendar.id), eq(rules.courseKey, key)))
      .limit(1);

    if (actions.length === 0) {
      if (existing) await db.delete(rules).where(eq(rules.id, existing.id));
      return c.json({ rule: null });
    }

    const values = { name: key, conditions: [courseCondition(key)], actions, enabled: true };
    const [row] = existing
      ? await db.update(rules).set(values).where(eq(rules.id, existing.id)).returning()
      : await db
          .insert(rules)
          .values({
            ...values,
            calendarId: calendar.id,
            courseKey: key,
            position: await nextRulePosition(c, calendar.id),
          })
          .returning();
    return c.json({ rule: toRule(row!) });
  })

  .post("/:id/rules", async (c) => {
    const calendar = await ownedCalendar(c);
    const input = await parseBody(c, ruleInputSchema);
    await assertRuleGroups(c, calendar.id, input.actions);
    const position = await nextRulePosition(c, calendar.id);
    if (position >= MAX_RULES) throw new HTTPException(400, { message: "Trop de règles" });

    const [row] = await c
      .get("db")
      .insert(rules)
      .values({ ...input, courseKey: input.courseKey ?? null, calendarId: calendar.id, position })
      .returning();
    return c.json({ rule: toRule(row!) }, 201);
  })

  .put("/:id/rules/order", async (c) => {
    const calendar = await ownedCalendar(c);
    const { ids } = await parseBody(c, z.object({ ids: z.array(uuid).max(MAX_RULES) }));
    const db = c.get("db");
    await Promise.all(
      ids.map((ruleId, position) =>
        db
          .update(rules)
          .set({ position })
          .where(and(eq(rules.id, ruleId), eq(rules.calendarId, calendar.id))),
      ),
    );
    return c.json({ rules: await loadRules(db, calendar.id) });
  })

  .put("/:id/rules/:ruleId", async (c) => {
    const calendar = await ownedCalendar(c);
    const ruleId = idParam(c, "ruleId");
    const input = await parseBody(c, ruleInputSchema);
    await assertRuleGroups(c, calendar.id, input.actions);

    const [row] = await c
      .get("db")
      .update(rules)
      .set({ ...input, courseKey: input.courseKey ?? null })
      .where(and(eq(rules.id, ruleId), eq(rules.calendarId, calendar.id)))
      .returning();
    if (!row) throw new HTTPException(404, { message: "Règle introuvable" });
    return c.json({ rule: toRule(row) });
  })

  .delete("/:id/rules/:ruleId", async (c) => {
    const calendar = await ownedCalendar(c);
    const ruleId = idParam(c, "ruleId");
    await c
      .get("db")
      .delete(rules)
      .where(and(eq(rules.id, ruleId), eq(rules.calendarId, calendar.id)));
    return c.body(null, 204);
  })

  .post("/:id/groups", async (c) => {
    const calendar = await ownedCalendar(c);
    const input = await parseBody(c, groupInput);
    const existing = await loadGroups(c, calendar.id);
    if (existing.length >= 20) throw new HTTPException(400, { message: "Limite de 20 groupes atteinte" });

    const [group] = await c
      .get("db")
      .insert(groups)
      .values({ ...input, calendarId: calendar.id, position: existing.length })
      .returning();
    return c.json({ group }, 201);
  })

  .patch("/:id/groups/:groupId", async (c) => {
    const calendar = await ownedCalendar(c);
    const groupId = idParam(c, "groupId");
    const input = await parseBody(c, groupInput.partial());
    const [group] = await c
      .get("db")
      .update(groups)
      .set(input)
      .where(and(eq(groups.id, groupId), eq(groups.calendarId, calendar.id)))
      .returning();
    if (!group) throw new HTTPException(404, { message: "Groupe introuvable" });
    return c.json({ group });
  })

  .delete("/:id/groups/:groupId", async (c) => {
    const calendar = await ownedCalendar(c);
    const groupId = idParam(c, "groupId");
    const db = c.get("db");

    // Drop references to the group so events fall back to "ungrouped".
    const ruleList = await loadRules(db, calendar.id);
    for (const rule of ruleList) {
      const actions = rule.actions.filter((a) => !(a.type === "set_group" && a.groupId === groupId));
      if (actions.length === rule.actions.length) continue;
      if (actions.length === 0) await db.delete(rules).where(eq(rules.id, rule.id));
      else await db.update(rules).set({ actions }).where(eq(rules.id, rule.id));
    }

    await db.delete(groups).where(and(eq(groups.id, groupId), eq(groups.calendarId, calendar.id)));
    return c.body(null, 204);
  });
