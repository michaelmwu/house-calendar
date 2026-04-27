# house-calendar

Private house occupancy, public availability, and lightweight stay requests.

## Project Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) for system design and intended build order
- [AGENTS.md](./AGENTS.md) for project-specific agent instructions
- [config/config.example.json](./config/config.example.json) for the checked-in config shape

## Stack

- Next.js App Router
- Bun for package management, scripts, and tests
- Postgres in Docker Compose for local persistence
- TypeScript
- Biome for linting and formatting
- Tailwind CSS v4 for fast UI styling
- shadcn/ui for accessible React UI primitives
- Drizzle ORM for Postgres schema and typed queries
- Zod for config and domain validation
- `date-fns` for date math

## Commands

Install dependencies:

```bash
bun install
```

See the derived worktree ports:

```bash
bun run ports
```

Write `.env` for this worktree:

```bash
bun run ports:write
```

Start Postgres in Docker Compose:

```bash
bun run db:start
```

Start the app on the host:

```bash
bun dev
```

Run the current checks:

```bash
bun run check
```

GitHub Actions runs:

- `bun run lint`
- `bun run typecheck`
- `bun run test`

Format the repo:

```bash
bun run format
```

Generate a Drizzle migration from schema changes:

```bash
bun run db:generate
```

Create a local-only admin account without using the setup page:

```bash
bun run admin:bootstrap-dev -- --email owner@example.com --password 'correct horse battery staple'
```

Reset the existing admin password and revoke all admin sessions:

```bash
bun run admin:reset-password -- --email owner@example.com --password 'new strong password'
```

The app port is worktree-specific, so use `bun run ports` to see the exact URL.

## Current Scope

- Parse all-day ICS-style events into typed internal facts
- Derive room and whole-house availability from those facts
- Redact guest details from public output
- Support revocable share links and lightweight stay requests

The current repo includes:

- A demo landing page that shows the first product slice
- An optional shared-password gate for the public viewer pages
- Multi-house routing with per-house viewer pages at `/{siteId}`
- A house switcher for hopping between configured houses
- A DB-backed global admin auth flow with per-house admin views at `/admin/{siteId}`
- A checked-in example config at `config/config.example.json`
- A parser module for event titles like `Someone stays (guest room)`, `Someone stays (guest room, tentative)`, `Michael [TPE]`, and `Michael in Tokyo (not staying)`
- Availability derivation that treats end dates as departure dates
- ICS ingestion for all-day `VEVENT`s from configured calendar feeds
- A short-lived in-memory ICS cache plus manual admin-triggered sync
- Postgres environment plumbing via `DATABASE_URL`
- Drizzle schema definitions for current auth tables
- shadcn/ui setup with reusable local UI primitives in `src/components/ui`
- JSON demo endpoints at `/api/health` and `/api/demo`
- Bun tests for parser and availability logic

## Domain Notes

- Raw event titles are inputs, not UI
- Housemate presence may be public, guest identity should stay private
- Requests are proposals, not automatic holds
- Tentative stay titles should render as tentative availability, not confirmed occupancy
- End dates are exclusive for all-day stays

## Config Model

The current direction is a hybrid split:

- Checked-in structural config:
  `config/config.example.json`
- Secrets in env:
  `ICS_URL_*`, `DATABASE_URL`, `VIEWER_PASSWORD`, signing secrets later
- Mutable state in Postgres:
  share links, requests, overrides, imported events

The app is not DB-driven for house config yet, but the shape is moving there.

Recommended self-hosting flow:

1. Copy the values from `config/config.example.json` into `config/config.json`
2. Set `defaultSiteId` if you want `/` and `/admin` to open a specific house first
3. Add one entry under `sites` for each house you want in the deployment
4. Change each house's rooms, people, branding, parsing rules, and calendars in the JSON override
   - `site.branding.faviconPath` should point at a local asset under `public/`, for example `/branding/default/favicon.png`
5. Optionally set `calendarInterpretation.allDayEndDateMode` per house:
   - `"calendar_days"` if your calendar events represent the actual occupied calendar days
   - `"checkout_day"` if your calendar events are written like human travel ranges and the last displayed day should be free/checkout
6. For each calendar, either:
   - keep `envVar: "ICS_URL_TOKYO"` / `ICS_URL_TAIWAN` style env references and set those in env, or
   - use `url: "https://..."` in `config/config.json` for private local-only dev
7. If `viewerAccess.mode` is `"password"`, set `VIEWER_PASSWORD` in env
8. Optionally set `ICS_SYNC_TTL_MINUTES` in env to change the default 15 minute cache TTL
9. Run `bun dev` and the app will import all-day ICS events directly

`config/config.json` is gitignored and overrides `config/config.example.json` when present.

`calendarInterpretation.allDayEndDateMode` controls how imported all-day ICS
`DTEND` values are interpreted:

- `"calendar_days"` keeps standard ICS semantics where `DTEND` is exclusive.
  Example: an event shown in Google Calendar as `May 6–9` blocks May 6, 7, 8,
  and 9, with May 10 free.
- `"checkout_day"` shifts imported all-day `DTEND` back by one day so the last
  displayed day is treated as checkout/free in availability. Example: an event
  shown in Google Calendar as `May 6–9` blocks May 6, 7, and 8, with May 9
  free.

Current sync behavior:

- Page loads reuse cached ICS data for 15 minutes by default
- `POST /admin/{siteId}/sync` forces an immediate refresh for that house and resets its cache entry
- The cache is in-memory, so restarting the app clears it
- `people[].defaultRoomId` marks which room a known housemate occupies when a `presence.in` event is parsed, unless the title explicitly says `not staying`
- Sample fallback is development-only when a site imports zero all-day ICS events; production keeps the real empty state and warnings
- Calendar cache is keyed by `siteId`, so Tokyo and Taiwan refresh independently

Viewer page access:

- `viewerAccess.mode: "public"` leaves all configured house pages open
- `viewerAccess.mode: "password"` requires `VIEWER_PASSWORD` in env
- successful unlock stores an httpOnly cookie so viewers do not need to re-enter the password on every request
- viewer access is deployment-global today, not scoped per house
- `site.branding.faviconPath` is a per-house app-relative path to a favicon asset served from `public/`

## Local Database

The app runs on the host. Only Postgres is containerized.

- [compose.yml](./compose.yml) starts a local `postgres:18-alpine`
- [scripts/worktree-ports.ts](./scripts/worktree-ports.ts) derives unique app and database ports from the worktree path
- [scripts/dev.ts](./scripts/dev.ts) writes `.env` and starts Next.js on the derived port
- [src/lib/server/db-schema.ts](./src/lib/server/db-schema.ts) is the Drizzle schema source

For local dev, the generated defaults are:

- `POSTGRES_DB=house_calendar`
- `POSTGRES_USER=house_calendar`
- `POSTGRES_PASSWORD=house_calendar`

Override any of them by exporting env vars before running the scripts.

## Admin Auth

The first real auth slice is now implemented.

- `bun run admin:bootstrap-code` generates a one-time setup code
- `bun run admin:bootstrap-dev` is a local-only shortcut that creates the admin once and then leaves it unchanged
- `bun run admin:reset-password` is an explicit operator recovery path
- `/admin/setup` creates the single admin account with email + password
- `/admin/login` handles normal password login
- `/admin/{siteId}` shows house-specific diagnostics and sync controls
- Admin sessions are stored in Postgres and are global for the deployment
- SMTP is not required for local dev or the default production flow

Minimal local flow:

1. Run `bun run db:start`
2. Run `bun run admin:bootstrap-code`
3. Run `bun dev`
4. Visit `/admin/setup`
5. Enter the one-time bootstrap code and create the owner email + password

Fast local-only setup:

1. Run `bun run db:start`
2. Run `bun run admin:bootstrap-dev -- --email owner@example.com --password 'correct horse battery staple'`
3. Run `bun dev`
4. Visit `/admin/login`

`admin:bootstrap-dev` is disabled when `NODE_ENV=production` so the standard bootstrap-code flow remains the deploy path.

Operator reset flow:

1. Run `bun run admin:reset-password -- --email owner@example.com --password 'new strong password'`
2. Existing admin sessions are revoked immediately
3. Visit `/admin/login`

## Next Steps

- Replace sample data with real ICS ingestion
- Persist houses, parsing rules, and share policies
- Add request submission and approval workflow
- Add signed viewer tokens and optional email-based recovery flows

That is enough to start building the real thing without pretending the domain model can wait.
