import { readFileSync } from "node:fs";
import { join } from "node:path";

export const ade = readFileSync(join(import.meta.dirname, "ade.ics"), "utf8");
