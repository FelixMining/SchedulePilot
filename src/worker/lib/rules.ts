import { asc, eq } from "drizzle-orm";
import type { Condition, Rule } from "../../shared/rules";
import type { Database } from "../db/client";
import { rules, type RuleRow } from "../db/schema";

export function toRule(row: RuleRow): Rule {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    matchMode: row.matchMode,
    conditions: row.conditions,
    actions: row.actions,
    courseKey: row.courseKey,
    position: row.position,
  };
}

export async function loadRules(db: Database, calendarId: string): Promise<Rule[]> {
  const rows = await db
    .select()
    .from(rules)
    .where(eq(rules.calendarId, calendarId))
    .orderBy(asc(rules.position), asc(rules.createdAt));
  return rows.map(toRule);
}

/**
 * Condition matching every event of a course listed in the "courses" view.
 * Codes are matched loosely so "HAI203I" also catches "HAI-203I" or "HAI 203I".
 */
export function courseCondition(key: string): Condition {
  const code = /^([A-Z]{2,5})(\d{2,4}[A-Z]?)$/.exec(key);
  if (code) {
    return { field: "summary", operator: "regex", value: `\\b${code[1]}[- ]?${code[2]}\\b`, caseSensitive: true };
  }
  return { field: "summary", operator: "equals", value: key, caseSensitive: true };
}
