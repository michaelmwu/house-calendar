# house-calendar

Private house occupancy, public availability, and lightweight stay requests.

## Project Docs

- [ARCHITECTURE.md](/Users/michaelwu/conductor/workspaces/house-calendar/washington-v5/ARCHITECTURE.md:1) for system design and intended build order
- [AGENTS.md](/Users/michaelwu/conductor/workspaces/house-calendar/washington-v5/AGENTS.md:1) for project-specific agent instructions
- [config/config.example.ts](/Users/michaelwu/conductor/workspaces/house-calendar/washington-v5/config/config.example.ts:1) for the checked-in config shape

## Stack

- Next.js App Router
- Bun for package management, scripts, and tests
- Postgres in Docker Compose for local persistence
- TypeScript
- Tailwind CSS v4 for fast UI styling
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

The app port is worktree-specific, so use `bun run ports` to see the exact URL.

## Current Scope

- Parse all-day ICS-style events into typed internal facts
- Derive room and whole-house availability from those facts
- Redact guest details from public output
- Support revocable share links and lightweight stay requests

The current repo includes:

- A demo landing page that shows the first product slice
- A checked-in example config at `config/config.example.ts`
- A parser module for event titles like `Someone stays (guest room)` and `Michael [TPE]`
- Availability derivation that treats end dates as departure dates
- Postgres environment plumbing via `DATABASE_URL`
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

- [compose.yml](/Users/michaelwu/conductor/workspaces/house-calendar/washington-v5/compose.yml:1) starts a local `postgres:18-alpine`
- [scripts/worktree-ports.ts](/Users/michaelwu/conductor/workspaces/house-calendar/washington-v5/scripts/worktree-ports.ts:1) derives unique app and database ports from the worktree path
- [scripts/dev.ts](/Users/michaelwu/conductor/workspaces/house-calendar/washington-v5/scripts/dev.ts:1) writes `.env` and starts Next.js on the derived port

For local dev, the generated defaults are:

- `POSTGRES_DB=house_calendar`
- `POSTGRES_USER=house_calendar`
- `POSTGRES_PASSWORD=house_calendar`

Override any of them by exporting env vars before running the scripts.

## Next Steps

- Replace sample data with real ICS ingestion
- Persist houses, parsing rules, and share policies
- Add request submission and approval workflow
- Add auth for admin access and signed viewer tokens

That is enough to start building the real thing without pretending the domain model can wait.
