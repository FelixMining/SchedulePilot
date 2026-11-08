import { detectCode, detectType } from "./detect";
import type { Condition, Rule } from "./schema";
import { renderTemplate, type Variables } from "./template";

export interface EventFields {
  summary: string;
  description: string;
  location: string;
}

export interface TransformResult {
  hidden: boolean;
  summary: string;
  description: string;
  location: string;
  groupId: string | null;
  matchedRuleIds: string[];
}

function fieldValues(condition: Condition, event: EventFields): string[] {
  if (condition.field === "any") return [event.summary, event.description, event.location];
  return [event[condition.field]];
}

const regexCache = new Map<string, RegExp | null>();

function compile(source: string, flags: string): RegExp | null {
  const key = `${flags}/${source}`;
  if (!regexCache.has(key)) {
    try {
      regexCache.set(key, new RegExp(source, flags));
    } catch {
      regexCache.set(key, null);
    }
  }
  return regexCache.get(key)!;
}

/**
 * Returns the captured named groups when the condition matches, or null otherwise.
 * Named groups from regex conditions become template variables.
 */
export function matchCondition(condition: Condition, event: EventFields): Variables | null {
  const sensitive = condition.caseSensitive ?? false;
  const norm = (s: string) => (sensitive ? s : s.toLocaleLowerCase("fr"));
  const needle = norm(condition.value);

  if (condition.operator === "not_contains") {
    return fieldValues(condition, event).every((v) => !norm(v).includes(needle)) ? {} : null;
  }

  for (const raw of fieldValues(condition, event)) {
    const value = norm(raw);
    switch (condition.operator) {
      case "contains":
        if (value.includes(needle)) return {};
        break;
      case "equals":
        if (value.trim() === needle.trim()) return {};
        break;
      case "starts_with":
        if (value.startsWith(needle)) return {};
        break;
      case "regex": {
        const re = compile(condition.value, sensitive ? "" : "i");
        const m = re?.exec(raw);
        if (m) {
          const groups: Variables = {};
          for (const [k, v] of Object.entries(m.groups ?? {})) groups[k] = v ?? "";
          return groups;
        }
        break;
      }
    }
  }
  return null;
}

export function matchRule(rule: Rule, event: EventFields): Variables | null {
  if (rule.conditions.length === 0) return {};
  const captured: Variables = {};
  if (rule.matchMode === "any") {
    for (const c of rule.conditions) {
      const m = matchCondition(c, event);
      if (m) return Object.assign(captured, m);
    }
    return null;
  }
  for (const c of rule.conditions) {
    const m = matchCondition(c, event);
    if (!m) return null;
    Object.assign(captured, m);
  }
  return captured;
}

/**
 * Conditions are always evaluated against the original event, so the order of
 * rules only matters when two rules write the same field (the last one wins).
 */
export function applyRules(rules: Rule[], event: EventFields): TransformResult {
  const result: TransformResult = {
    hidden: false,
    summary: event.summary,
    description: event.description,
    location: event.location,
    groupId: null,
    matchedRuleIds: [],
  };

  const base: Variables = {
    summary: event.summary,
    description: event.description,
    location: event.location,
    type: detectType(event.summary, event.description),
    code: detectCode(event.summary),
  };

  for (const rule of rules) {
    if (!rule.enabled) continue;
    const captured = matchRule(rule, event);
    if (!captured) continue;
    result.matchedRuleIds.push(rule.id);

    const vars: Variables = { ...base, ...captured, title: result.summary };
    for (const action of rule.actions) {
      switch (action.type) {
        case "hide":
          result.hidden = true;
          return result;
        case "set_title":
          result.summary = renderTemplate(action.template, vars) || result.summary;
          vars.title = result.summary;
          break;
        case "set_description":
          result.description = renderTemplate(action.template, vars);
          break;
        case "set_location":
          result.location = renderTemplate(action.template, vars);
          break;
        case "set_group":
          result.groupId = action.groupId;
          break;
      }
    }
  }
  return result;
}
