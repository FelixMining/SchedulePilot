import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { createApp } from "../../src/worker/app";
import type { Database } from "../../src/worker/db/client";
import * as schema from "../../src/worker/db/schema";

const ORIGIN = "http://localhost";
const migrationsDir = join(import.meta.dirname, "../../drizzle");

export async function createTestDb(): Promise<Database> {
  const client = new PGlite();
  for (const file of readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      if (statement.trim()) await client.exec(statement);
    }
  }
  return drizzle(client, { schema }) as unknown as Database;
}

export interface Upstream {
  body: string;
  status: number;
  calls: number;
}

export async function setup(initialIcs: string) {
  const db = await createTestDb();
  const upstream: Upstream = { body: initialIcs, status: 200, calls: 0 };
  const fakeFetch = (async () => {
    upstream.calls++;
    return new Response(upstream.body, { status: upstream.status });
  }) as typeof fetch;

  const app = createApp({ getDb: () => db, fetch: fakeFetch });
  const env = { DATABASE_URL: "", ASSETS: {} } as unknown as Env;

  let cookie = "";
  async function request(method: string, path: string, body?: unknown) {
    const res = await app.request(
      `${ORIGIN}${path}`,
      {
        method,
        headers: {
          Origin: ORIGIN,
          ...(cookie ? { Cookie: cookie } : {}),
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      env,
    );
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0]!.endsWith("=") ? "" : setCookie.split(";")[0]!;
    const type = res.headers.get("content-type") ?? "";
    const data = type.includes("json") ? await res.json() : await res.text();
    return { status: res.status, data: data as any };
  }

  return { app, env, db, upstream, request, clearCookie: () => (cookie = "") };
}
