# AGENTS.md

## Project Intent

This repo is for a privacy-preserving house availability app.

The product is not a public calendar mirror. The core job is:

1. ingest private calendar data
2. parse it into typed internal facts
3. derive redacted availability for trusted viewers
4. support lightweight stay requests without becoming a booking marketplace

If a change pushes the app toward exposing raw calendar details, that is probably the wrong direction.

## Ground Truth

Before making non-trivial changes, read:

- `README.md` for developer workflow
- `ARCHITECTURE.md` for system boundaries and future direction
- `config/config.example.ts` for the current config shape

Do not assume this is a generic starter app. The domain model matters here.

## Runtime Model

- The app runs on the host with Bun and Next.js.
- Postgres runs in Docker Compose for local development.
- Per-worktree ports are derived by `scripts/worktree-ports.ts`.
- `bun dev` already handles writing `.env` and starting Next on the derived port.

Use these commands instead of improvising:

- `bun run ports`
- `bun run ports:write`
- `bun run db:start`
- `bun run db:stop`
- `bun dev`
- `bun run lint`
- `bun run format`
- `bun run check`

Do not replace the wrapped `typecheck` flow with raw `tsc --noEmit`. This repo uses `scripts/typecheck.ts` because of Next route type generation behavior.

## Config Rules

Treat configuration as three layers:

1. checked-in structural config
2. secrets in env
3. mutable runtime state in Postgres

Current checked-in example:

- `config/config.example.ts`

Planned private local variant:

- `config/config.local.ts`

Never commit:

- real ICS URLs
- signing secrets
- mail credentials
- private instance config files

If you add new secret-bearing fields, keep them in env or clearly marked sensitive DB columns.

## Domain Rules

These are not optional stylistic preferences. They are product invariants.

- Raw event titles are inputs, not UI.
- Guest names should stay private in public or shared views.
- Housemate visibility is explicit, never assumed.
- All-day stay end dates are exclusive. Departure date is not a booked night.
- Requests are proposals, not holds.
- Parsing should be deterministic first. Do not lead with LLM parsing for core availability logic.
- Admin auth is single-tenant and password-first right now. Do not reintroduce SMTP as a required dependency without updating docs and architecture.

If you change any of these assumptions, update `ARCHITECTURE.md` and explain why.

## Code Boundaries

Keep reusable domain logic out of route handlers and page components.

Current boundaries:

- `src/lib/house/*` for parsing, availability derivation, and sample domain data
- `src/lib/config/*` for instance config schema and mapping
- `src/lib/server/*` for server-only runtime helpers
- `src/app/*` for UI and route handlers
- `scripts/*` for local workflow and build/tooling glue

Preferred direction:

- parsing and availability remain framework-agnostic
- persistence and sync layers can change without rewriting core rules
- UI should consume derived state, not reimplement domain logic

## Next.js Rules

This repo uses modern App Router Next.js. Do not rely on stale assumptions.

Before framework-level edits, check the local docs in:

- `node_modules/next/dist/docs/`

Especially if changing:

- route handlers
- metadata
- type generation
- build and dev workflow

## Documentation Rules

When architecture or workflow changes, update the docs in the same change:

- `README.md` for developer workflow
- `ARCHITECTURE.md` for system design
- `AGENTS.md` for agent operating rules

Do not leave the docs describing a different app than the code.

## Review Standard

Prefer small, defensible changes.

Call out:

- privacy leaks
- auth mistakes
- incorrect date semantics
- config/secret confusion
- hidden multi-worktree port collisions
- accidental coupling between demo data and real runtime paths

If something is still scaffolding, say so plainly.
