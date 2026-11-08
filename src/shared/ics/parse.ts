export interface IcsParam {
  name: string;
  value: string;
}

export interface IcsProperty {
  name: string;
  params: IcsParam[];
  value: string;
}

export interface IcsComponent {
  name: string;
  properties: IcsProperty[];
  components: IcsComponent[];
}

export class IcsParseError extends Error {}

/**
 * RFC 5545 §3.1: a line starting with a space or a tab continues the previous one.
 */
export function unfoldLines(input: string): string[] {
  const raw = input.replace(/\r\n|\r/g, "\n").split("\n");
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else if (line.length > 0) {
      lines.push(line);
    }
  }
  return lines;
}

export function parseContentLine(line: string): IcsProperty {
  let i = 0;
  let inQuotes = false;

  // Name ends at the first ';' or ':'. Param values may contain quoted ':' though.
  while (i < line.length && line[i] !== ";" && line[i] !== ":") i++;
  const name = line.slice(0, i).toUpperCase();
  if (!name) throw new IcsParseError(`Invalid content line: ${line}`);

  const params: IcsParam[] = [];
  while (i < line.length && line[i] === ";") {
    i++;
    const start = i;
    while (i < line.length && line[i] !== "=") i++;
    const paramName = line.slice(start, i).toUpperCase();
    i++; // skip '='
    const valueStart = i;
    while (i < line.length) {
      const ch = line[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (!inQuotes && (ch === ";" || ch === ":")) break;
      i++;
    }
    params.push({ name: paramName, value: line.slice(valueStart, i) });
  }

  if (line[i] !== ":") throw new IcsParseError(`Missing value in line: ${line}`);
  return { name, params, value: line.slice(i + 1) };
}

export function parseIcs(input: string): IcsComponent {
  const lines = unfoldLines(input);
  const root: IcsComponent = { name: "ROOT", properties: [], components: [] };
  const stack: IcsComponent[] = [root];

  for (const line of lines) {
    const prop = parseContentLine(line);
    const current = stack[stack.length - 1]!;
    if (prop.name === "BEGIN") {
      const child: IcsComponent = { name: prop.value.toUpperCase(), properties: [], components: [] };
      current.components.push(child);
      stack.push(child);
    } else if (prop.name === "END") {
      if (stack.length === 1 || current.name !== prop.value.toUpperCase()) {
        throw new IcsParseError(`Unexpected END:${prop.value}`);
      }
      stack.pop();
    } else {
      current.properties.push(prop);
    }
  }

  if (stack.length !== 1) throw new IcsParseError(`Unclosed component ${stack[stack.length - 1]!.name}`);
  const calendar = root.components.find((c) => c.name === "VCALENDAR");
  if (!calendar) throw new IcsParseError("No VCALENDAR found");
  return calendar;
}

export function unescapeText(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_, ch: string) => (ch === "n" || ch === "N" ? "\n" : ch));
}

export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function getProperty(component: IcsComponent, name: string): IcsProperty | undefined {
  return component.properties.find((p) => p.name === name);
}

export function getText(component: IcsComponent, name: string): string {
  const prop = getProperty(component, name);
  return prop ? unescapeText(prop.value) : "";
}

export function setText(component: IcsComponent, name: string, value: string): void {
  const index = component.properties.findIndex((p) => p.name === name);
  if (!value) {
    if (index !== -1) component.properties.splice(index, 1);
    return;
  }
  const prop: IcsProperty = { name, params: [], value: escapeText(value) };
  if (index === -1) component.properties.push(prop);
  else component.properties[index] = prop;
}

export function setRaw(component: IcsComponent, name: string, value: string, params: IcsParam[] = []): void {
  const index = component.properties.findIndex((p) => p.name === name);
  const prop: IcsProperty = { name, params, value };
  if (index === -1) component.properties.push(prop);
  else component.properties[index] = prop;
}
