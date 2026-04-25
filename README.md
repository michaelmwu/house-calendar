# house-calendar

Private house occupancy, public availability, and lightweight stay requests.

## Project Docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) for system design and intended build order
- [AGENTS.md](./AGENTS.md) for project-specific agent instructions
- [config/config.example.ts](./config/config.example.ts) for the checked-in config shape

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

The app port is worktree-specific, so use `bun run ports` to see the exact URL.

## Current Scope

- Parse all-day ICS-style events into typed internal facts
- Derive room and whole-house availability from those facts
- Redact guest details from public output
- Support revocable share links and lightweight stay requests

The current repo includes:

- A demo landing page that shows the first product slice
- A DB-backed single-tenant admin auth flow at `/admin`
- A checked-in example config at `config/config.example.ts`
- A parser module for event titles like `Someone stays (guest room)` and `Michael [TPE]`
- Availability derivation that treats end dates as departure dates
- Postgres environment plumbing via `DATABASE_URL`
- Drizzle schema definitions for current auth tables
- shadcn/ui setup with reusable local UI primitives in `src/components/ui`
- JSON demo endpoints at `/api/health` and `/api/demo`
- Bun tests for parser and availability logic

## Domain Notes

- Raw event titles are inputs, not UI
- Housemate presence may be public, guest identity should stay private
- Requests are proposals, not automatic holds
- End dates are exclusive for all-day stays

## Config Model

The current direction is a hybrid split:

- Checked-in structural config:
  `config/config.example.ts`
- Secrets in env:
  `ICS_URL_*`, `DATABASE_URL`, signing secrets later
- Mutable state in Postgres:
  share links, requests, overrides, imported events

The app is not DB-driven for house config yet, but the shape is moving there.

Recommended self-hosting flow:

1. Copy `config/config.example.ts` to `config/config.local.ts`
2. Change rooms, people, branding, and parsing rules
3. Set secrets in env or Coolify
4. Later, run a bootstrap/import command once the DB tables exist

Right now, the example config is the checked-in source used by the demo app.

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
- `/admin/setup` creates the single admin account with email + password
- `/admin/login` handles normal password login
- Admin sessions are stored in Postgres
- SMTP is not required for local dev or the default production flow

Minimal local flow:

1. Run `bun run db:start`
2. Run `bun run admin:bootstrap-code`
3. Run `bun dev`
4. Visit `/admin/setup`
5. Enter the one-time bootstrap code and create the owner email + password

## Next Steps

- Replace sample data with real ICS ingestion
- Persist houses, parsing rules, and share policies
- Add request submission and approval workflow
- Add signed viewer tokens and optional email-based recovery flows

That is enough to start building the real thing without pretending the domain model can wait.
