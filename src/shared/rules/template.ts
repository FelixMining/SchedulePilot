export type Variables = Record<string, string>;

/** Replaces {name} placeholders. Unknown variables render as an empty string. */
export function renderTemplate(template: string, vars: Variables): string {
  const out = template.replace(/\{([a-zA-Z_][\w]*)\}/g, (_, key: string) => vars[key] ?? "");
  return out
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const TEMPLATE_VARIABLES = [
  { name: "summary", description: "Titre d'origine" },
  { name: "description", description: "Description d'origine" },
  { name: "location", description: "Salle / lieu d'origine" },
  { name: "type", description: "Type détecté (CM, TD, TP, Examen…)" },
  { name: "code", description: "Code du cours détecté (ex. HAI203I)" },
  { name: "title", description: "Titre actuel (après les règles précédentes)" },
] as const;
