const TYPE_PATTERNS: [RegExp, string][] = [
  [/\b(CM|cours\s+magistral|amphi)\b/i, "CM"],
  [/\bTD\b/i, "TD"],
  [/\bTP\b/i, "TP"],
  [/\b(examen|exam|partiel|contr[ôo]le|CC\d?|DS)\b/i, "Examen"],
  [/\b(projet|project)\b/i, "Projet"],
];

/** Guesses the kind of session (CM, TD, TP...) from the raw text of an event. */
export function detectType(...texts: string[]): string {
  for (const text of texts) {
    for (const [pattern, label] of TYPE_PATTERNS) {
      if (pattern.test(text)) return label;
    }
  }
  return "";
}

/**
 * Course codes look like "HAI203I", "HAX101X" or "INF-2104": a few capital
 * letters followed by digits, optionally separated by a dash or a space.
 */
const CODE_PATTERN = /\b([A-Z]{2,5})[- ]?(\d{2,4}[A-Z]?)\b/;

export function detectCode(text: string): string {
  const match = CODE_PATTERN.exec(text);
  return match ? `${match[1]}${match[2]}` : "";
}
