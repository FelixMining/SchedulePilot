import type { IcsComponent, IcsProperty } from "./parse";

const encoder = new TextEncoder();

/**
 * Lines must be folded at 75 octets (not characters), without splitting
 * a multi-byte UTF-8 sequence.
 */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  let limit = 75;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (currentBytes + size > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
      limit = 74; // continuation lines start with a space
    }
    current += char;
    currentBytes += size;
  }
  if (current) parts.push(current);
  return parts.join("\r\n ");
}

export function serializeProperty(prop: IcsProperty): string {
  const params = prop.params.map((p) => `;${p.name}=${p.value}`).join("");
  return foldLine(`${prop.name}${params}:${prop.value}`);
}

export function serializeComponent(component: IcsComponent): string[] {
  return [
    `BEGIN:${component.name}`,
    ...component.properties.map(serializeProperty),
    ...component.components.flatMap(serializeComponent),
    `END:${component.name}`,
  ];
}

export function serializeIcs(calendar: IcsComponent): string {
  return serializeComponent(calendar).join("\r\n") + "\r\n";
}
