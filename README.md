# house-calendar

`house-calendar` turns private house calendars into redacted, shareable availability.

It is built for the case where you want trusted people to know whether a room or house is free without exposing raw event titles, guest names, or your full personal calendar. The product is meant to stay lightweight: it helps people coordinate stays, but it is not a booking marketplace and not a public calendar mirror.

## What It Does

- Imports private calendar data and interprets it into typed internal facts
- Derives room and whole-house availability instead of rendering raw calendar events
- Redacts guest details and only shows housemate presence when configured explicitly
- Supports one deployment with multiple houses, each with its own branding and parsing rules
- Lets trusted viewers make lightweight stay requests without turning requests into automatic holds
- Gives the owner a small self-hosted admin flow with password-based access and manual sync controls

## Docs

- [DEVELOPMENT.md](./DEVELOPMENT.md) for setup, local workflow, commands, and admin bootstrap
- [DEPLOYMENT.md](./DEPLOYMENT.md) for provider-agnostic deployment requirements and config/env setup
- [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution expectations and review guardrails
- [ARCHITECTURE.md](./ARCHITECTURE.md) for system boundaries, data flow, privacy model, and technical direction
- [AGENTS.md](./AGENTS.md) for project-specific agent instructions
- [config/config.example.json](./config/config.example.json) for the checked-in config shape

## Quickstart

1. Install dependencies with `bun install`
2. Start Postgres with `bun run db:start`
3. Optionally copy `config/config.example.json` to `config/config.json` for private local overrides
4. Start the app with `bun dev`
5. Run `bun run ports` to see the worktree-specific local URL

Full setup, config, and day-to-day development commands live in [DEVELOPMENT.md](./DEVELOPMENT.md).
