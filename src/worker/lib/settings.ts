import { z } from "zod";
import type { Settings } from "../../shared/settings";
import { isValidTimeZone } from "../../shared/timezone";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide");
const keywords = z.array(z.string().trim().min(1).max(60)).max(50);

export const settingsSchema = z.object({
  colorMode: z.enum(["course", "type", "single"]),
  examsSeparate: z.boolean(),
  singleColor: color,
  timeZone: z.string().max(64).refine(isValidTimeZone, "Fuseau horaire inconnu"),
  location: z.object({ teachers: z.boolean() }),
  title: z.object({
    typePosition: z.enum(["after", "before", "none", "custom"]),
    template: z.string().max(200),
    highlightExams: z.boolean(),
  }),
  description: z.object({
    type: z.boolean(),
    rooms: z.boolean(),
    teachers: z.boolean(),
    course: z.boolean(),
    groups: z.boolean(),
  }),
  examKeywords: keywords,
  hideKeywords: keywords,
  alarms: z.object({
    examDaysBefore: z.number().int().min(0).max(14),
    minutesBefore: z.number().int().min(0).max(240),
  }),
  typeColors: z.object({ CM: color, TD: color, TP: color, Examen: color, Autre: color }),
  courses: z
    .record(
      z.string().max(200),
      z.object({
        name: z.string().max(120).optional(),
        color: color.optional(),
        hidden: z.boolean().optional(),
      }),
    )
    .refine((c) => Object.keys(c).length <= 500, "Trop de cours"),
  hiddenEvents: z.array(z.string().max(300)).max(5000),
}) satisfies z.ZodType<Settings>;
