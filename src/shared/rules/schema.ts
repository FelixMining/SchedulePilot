import { z } from "zod";
import { FIELDS, OPERATORS } from "./constants";

export const conditionSchema = z.object({
  field: z.enum(FIELDS),
  operator: z.enum(OPERATORS),
  value: z.string().max(500),
  caseSensitive: z.boolean().optional(),
});

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hide") }),
  z.object({ type: z.literal("set_title"), template: z.string().max(500) }),
  z.object({ type: z.literal("set_description"), template: z.string().max(2000) }),
  z.object({ type: z.literal("set_location"), template: z.string().max(500) }),
  z.object({ type: z.literal("set_group"), groupId: z.string().nullable() }),
]);

export const ruleInputSchema = z
  .object({
    name: z.string().trim().max(120).default(""),
    enabled: z.boolean().default(true),
    matchMode: z.enum(["all", "any"]).default("all"),
    conditions: z.array(conditionSchema).max(20),
    actions: z.array(actionSchema).min(1).max(10),
    courseKey: z.string().max(200).nullable().optional(),
  })
  .superRefine((rule, ctx) => {
    rule.conditions.forEach((c, i) => {
      if (c.operator !== "regex") return;
      try {
        new RegExp(c.value);
      } catch {
        ctx.addIssue({ code: "custom", path: ["conditions", i, "value"], message: "Expression régulière invalide" });
      }
    });
  });

export type Field = (typeof FIELDS)[number];
export type Operator = (typeof OPERATORS)[number];
export type Condition = z.infer<typeof conditionSchema>;
export type Action = z.infer<typeof actionSchema>;
export type RuleInput = z.infer<typeof ruleInputSchema>;

export interface Rule extends RuleInput {
  id: string;
  position: number;
}
