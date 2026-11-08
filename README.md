# SchedulePilot

**[schedulepilot.dev](https://schedulepilot.dev)**

My university publishes our timetable as an ICS feed. Subscribing to it from Apple Calendar works, but that's about it: course titles are raw codes like `HAI301I`, descriptions are a wall of group names and export timestamps, mentoring slots I never attend clutter the week, and everything shares a single color.

SchedulePilot sits between the university feed and your calendar app. It fetches the original feed, applies your rules and serves a clean feed that you subscribe to instead. Updates from the university still come through automatically.

```
ENT / ADE ──ICS──▶ SchedulePilot (rules) ──ICS──▶ Apple Calendar, Google Calendar, Outlook…
```

The interface is in French since it's aimed at French university students.

## Features

- **Automatic cleanup**: each event is parsed into structured data. The real course name is pulled from the description (`HAI101I` → `Algorithmique 1`), the session type is inferred from the title and the room (amphitheatre → CM, computer room → TP…), teachers are reformatted (`DUPONT   JEAN` → `Jean Dupont`), rooms are normalised and the list of every group attending a lecture is dropped.
- **One line per course**: rename it, pick a color, hide it. Changes are saved as you type.
- **Exams**: detected from a configurable keyword list, highlighted in the title, put in their own red calendar and given a reminder the day before.
- **Hide by keyword**: e.g. everything containing "mentorat".
- **Formatting options**: where the session type goes in the title, which details appear in the description, reminders before exams or every class.
- **Colors**: Apple Calendar only supports one color per subscribed calendar, so events are split into several calendars, either one per course, one per session type, or a single one.
- **One-tap install**: an Apple configuration profile subscribes an iPhone or a Mac to all the generated calendars at once.
- **Live week preview**, rendered in the browser with the same code that builds the feeds, so it always matches what the calendar app will show.
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
    extract.ts   turns raw events into structured data (course, type, rooms, teachers…)
    render.ts    applies the user's settings to an event, splits events into calendars
    settings.ts  settings model and defaults
    calendar.ts  feed building
    mobileconfig.ts  Apple configuration profile
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

Deploying (set `APP_URL` and the custom domain in `wrangler.jsonc` to your own domain first; requests to any other host, or over plain HTTP, are redirected there):

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

| URL                                | Content                                       |
| ---------------------------------- | --------------------------------------------- |
| `/feed/<token>.ics`                | every visible event, in one calendar          |
| `/feed/<token>/<calendar>.ics`     | one of the generated calendars (course, type) |
| `/feed/<token>/apple.mobileconfig` | Apple profile subscribing to all of them      |

## Ideas

- Rate limiting on login (Workers rate limiting binding)
- Share a setup with classmates (same course names and colors)
- Merge several university feeds into one

## License

MIT
