# SchedulePilot

My university publishes our timetable as an ICS feed. Subscribing to it from Apple Calendar works, but that's about it: course titles are raw codes like `HAI301I`, descriptions are a wall of group names and export timestamps, mentoring slots I never attend clutter the week, and everything shares a single color.

SchedulePilot sits between the university feed and your calendar app. It fetches the original feed, applies your rules and serves a clean feed that you subscribe to instead. Updates from the university still come through automatically.

```
ENT / ADE ──ICS──▶ SchedulePilot (rules) ──ICS──▶ Apple Calendar, Google Calendar, Outlook…
```

The interface is in French since it's aimed at French university students.

## Features

- **Rename courses**: `HAI301I Algorithmique avancée TD` → `Algorithmique · TD`, using templates with variables (`{type}`, `{code}`, `{location}`, regex named groups…).
- **Hide events**: drop mentoring, cancelled slots or other groups' sessions.
- **Rewrite descriptions and locations**: keep only what matters, e.g. `{type} · {location}`.
- **Colors**: Apple Calendar only supports one color per subscribed calendar, so events can be sorted into groups. Each group gets its own feed URL and you subscribe once per group.
- **Courses view**: courses are detected from the feed and grouped by code, so most of the setup is a matter of typing a name next to each one.
- **Rule engine** for anything more specific: ordered rules, `all`/`any` conditions on title, description or location (`contains`, `equals`, `starts with`, `regex`…), multiple actions per rule.
- **Live preview** of upcoming events with a side-by-side view of the original data.
- **Resilient**: the upstream feed is cached; if the university server is down, the last good copy keeps being served. A cron trigger refreshes active calendars in the background.

## Stack

| Layer    | Choice                                                              |
| -------- | ------------------------------------------------------------------- |
| Runtime  | Cloudflare Workers (API, feeds, cron) + Workers static assets (SPA) |
| API      | [Hono](https://hono.dev)                                            |
| Database | [Neon](https://neon.tech) Postgres via the serverless HTTP driver   |
| ORM      | [Drizzle](https://orm.drizzle.team)                                 |
| Frontend | React 19, React Router, TanStack Query, Tailwind CSS v4             |
| Build    | Vite with `@cloudflare/vite-plugin`                                 |
| Tests    | Vitest, with PGlite (in-memory Postgres) for API integration tests  |

The ICS parser/serializer is written from scratch (`src/shared/ics`). It keeps every property it doesn't touch, so time zones, recurrence rules and UIDs survive unchanged, and it folds lines at 75 octets as required by RFC 5545.

Authentication is email + password with PBKDF2-SHA256 hashes (WebCrypto) and server-side sessions stored as SHA-256 hashes of an HttpOnly cookie token.

## Project layout

```
src/
  shared/        code used by both the worker and the UI
    ics/         ICS parsing, serialization, dates
    rules/       rule schema, template rendering, type/code detection, engine
    calendar.ts  feed building, preview, course summary
  worker/        Cloudflare Worker
    routes/      auth, calendars, public feeds
    lib/         sessions, crypto, upstream fetching/caching
    db/          Drizzle schema and client
  client/        React app
drizzle/         SQL migrations
test/            unit + integration tests
```

## Running it yourself

You need Node.js 22+, a [Neon](https://neon.tech) database (the free tier is plenty) and a Cloudflare account.

```bash
npm install
cp .dev.vars.example .dev.vars   # then put your Neon connection string in it
DATABASE_URL="postgresql://..." npm run db:migrate
npm run dev
```

Deploying:

```bash
npx wrangler secret put DATABASE_URL
npm run deploy
```

### Scripts

| Command               | Description                          |
| --------------------- | ------------------------------------ |
| `npm run dev`         | Vite dev server running the worker   |
| `npm test`            | Unit and integration tests           |
| `npm run typecheck`   | TypeScript project references build  |
| `npm run db:generate` | Generate a migration from the schema |
| `npm run db:migrate`  | Apply migrations to `DATABASE_URL`   |
| `npm run deploy`      | Build and deploy to Cloudflare       |

## Feed URLs

Each calendar gets a random token. The token is the only secret, so it can be regenerated from the UI if a link leaks.

| URL                            | Content                         |
| ------------------------------ | ------------------------------- |
| `/feed/<token>.ics`            | every visible event             |
| `/feed/<token>/<group-id>.ics` | events assigned to one group    |
| `/feed/<token>/ungrouped.ics`  | visible events not in any group |

## Ideas

- Rate limiting on login (Workers rate limiting binding)
- Import/export of rules to share a setup with classmates
- Per-group default description templates

## License

MIT
