import type { Group } from "../../api";
import type { Action, Condition, Field, Operator, Rule } from "../../../shared/rules/schema";

export const FIELD_LABELS: Record<Field, string> = {
  summary: "Titre",
  description: "Description",
  location: "Lieu",
  any: "N'importe quel champ",
};

export const OPERATOR_LABELS: Record<Operator, string> = {
  contains: "contient",
  not_contains: "ne contient pas",
  equals: "est exactement",
  starts_with: "commence par",
  regex: "regex",
};

export const ACTION_LABELS: Record<Action["type"], string> = {
  hide: "Masquer",
  set_title: "Renommer",
  set_description: "Changer la description",
  set_location: "Changer le lieu",
  set_group: "Mettre dans un groupe",
};

export function describeCondition(c: Condition): string {
  return `${FIELD_LABELS[c.field]} ${OPERATOR_LABELS[c.operator]} « ${c.value} »`;
}

export function describeConditions(rule: Rule): string {
  if (rule.conditions.length === 0) return "Tous les événements";
  return rule.conditions.map(describeCondition).join(rule.matchMode === "all" ? " et " : " ou ");
}

export function describeAction(a: Action, groups: Group[]): string {
  switch (a.type) {
    case "hide":
      return "Masquer";
    case "set_title":
      return `Titre → « ${a.template} »`;
    case "set_description":
      return `Description → « ${a.template.replace(/\n/g, " ⏎ ")} »`;
    case "set_location":
      return `Lieu → « ${a.template} »`;
    case "set_group":
      return `Groupe → ${groups.find((g) => g.id === a.groupId)?.name ?? "aucun"}`;
  }
}
