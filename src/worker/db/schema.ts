import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { Action, Condition } from "../../shared/rules";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha-256 of the cookie token
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const calendars = pgTable(
  "calendars",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sourceUrl: text("source_url").notNull(),
    feedToken: text("feed_token").notNull(),
    color: text("color"),
    cachedIcs: text("cached_ics"),
    cachedAt: timestamp("cached_at", { withTimezone: true }),
    lastError: text("last_error"),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    lastServedAt: timestamp("last_served_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("calendars_user_idx").on(t.userId), uniqueIndex("calendars_feed_token_idx").on(t.feedToken)],
);

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    calendarId: uuid("calendar_id")
      .notNull()
      .references(() => calendars.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("groups_calendar_idx").on(t.calendarId)],
);

export const rules = pgTable(
  "rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    calendarId: uuid("calendar_id")
      .notNull()
      .references(() => calendars.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    enabled: boolean("enabled").notNull().default(true),
    matchMode: text("match_mode", { enum: ["all", "any"] })
      .notNull()
      .default("all"),
    conditions: jsonb("conditions").$type<Condition[]>().notNull(),
    actions: jsonb("actions").$type<Action[]>().notNull(),
    courseKey: text("course_key"),
    position: integer("position").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("rules_calendar_idx").on(t.calendarId)],
);

export type UserRow = typeof users.$inferSelect;
export type CalendarRow = typeof calendars.$inferSelect;
export type GroupRow = typeof groups.$inferSelect;
export type RuleRow = typeof rules.$inferSelect;
