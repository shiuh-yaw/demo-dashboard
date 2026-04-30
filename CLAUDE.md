# CLAUDE.md

Prime context for AI agents working on this monorepo.

## What this is

Multi-app Next.js monorepo for Dynamic Demos. Apps under `apps/<name>/`, shared packages under `packages/<name>/`. The dashboard (`apps/dashboard`) orchestrates demo creation and provider operations.

## Read these before starting any non-trivial task

- `docs/projects/demo-meta-system/PLAN.md` — current execution plan (the demo meta-system effort).
- `docs/projects/demo-meta-system/DECISIONS.md` — locked architectural decisions.
- `docs/projects/demo-meta-system/GLOSSARY.md` — terminology.
- `docs/projects/demo-meta-system/PROGRESS.md` — current execution state.

## Per-package and per-app docs

Every package and app in this monorepo has an `AGENTS.md` (template: `docs/templates/AGENTS.template.md`). Read the relevant `AGENTS.md` before touching code in a given package or app — frontmatter declares capabilities, regions, custody, provider docs links; body documents public surface, env, slots, invariants, and gotchas.

## Hard rules

1. `apps/spark26/` is production. Zero-touch unless your PR title contains `[spark26]` (CI-enforced).
2. Apps don't access Postgres directly — read config via dashboard API, persist transient state in Redis, user state in Dynamic metadata.
3. Apps hold only Dynamic + Fireblocks credentials; other provider secrets stay in dashboard.
4. Sandbox by default for every provider; production opt-in requires explicit env var + `[prod-creds]` PR title.
5. AGENTS.md is updated in the same PR that changes a package's behavior.

## Open archives

Iron API documentation (`IRON_API_DOCUMENTATION.md`, `IRON_API_FLOWS.md`) currently sits at root. These move into `packages/iron/docs/` when Phase 1B extracts the Iron client.

## Commands

- `pnpm install` — install workspace deps.
- `pnpm dev` — see per-app `package.json` for ports.
- `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo build && pnpm turbo test` — full pre-PR check.
