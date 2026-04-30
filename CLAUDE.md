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

## CI gates

GitHub Actions workflows live under `.github/workflows/`. Every PR runs through the gates below before review.

- `.github/workflows/ci.yml` — runs `pnpm turbo typecheck`, `lint`, `build`, `test` on every PR and every push to `main`. Caches the pnpm store and uses Turbo remote cache when `TURBO_TOKEN`/`TURBO_TEAM` are set; otherwise falls back to local cache.
- `.github/workflows/spark26-protection.yml` — fails any PR modifying `apps/spark26/` unless the PR title contains `[spark26]`. Implements the D-006 zero-touch rule. Logic in `.github/scripts/check-spark26-protection.sh` (locally testable).
- Production-credentials guardrail (step inside `ci.yml`) — fails any PR whose `apps/*` env files reference `PRODUCTION` unless the PR title contains `[prod-creds]`. Implements D-005 (sandbox by default). Logic in `.github/scripts/check-prod-creds.sh`. Spark26 is excluded — it has its own gate above.
