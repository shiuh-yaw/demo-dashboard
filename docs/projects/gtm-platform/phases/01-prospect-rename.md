# Phase 01 - Brand -> Prospect rename

> **Self-contained agent prompt.** Read this entire file, then `../DESIGN.md`, `../PLAN.md` (Shared contracts), and `docs/projects/demo-meta-system/DECISIONS.md`.

## Your role

Rename the `Brand` concept to `Prospect` everywhere: Prisma model + table, service layer, actions, mappers, backfill scripts, dashboard routes, and docs. Add two nullable identity columns (`domain`, `notes`). This is the GTM platform's foundational rename - a prospect is a company we sell to; its visual theme is one facet of that record, not the whole identity.

One logical PR. Behavior-preserving except for the two new nullable columns.

## Wave + dependencies

- Wave 1. No dependencies. Blocks Phases 03, 05, 07.
- Runs in parallel with Phase 02 (no file overlap - 02 only creates `packages/analytics`).

## Skills to use

1. `superpowers:using-git-worktrees` - `.worktrees/gtm-01-prospect-rename`, branch `gtm/01-prospect-rename`.
2. `superpowers:test-driven-development` for the new columns; parity tests guard the rename.
3. `superpowers:verification-before-completion`, `superpowers:requesting-code-review`.

## Hard rules

- `apps/spark26/` zero-touch.
- The deterministic id hash from `(ownerId, primaryColor, logoUrl)` (see `apps/dashboard/scripts/backfill-brands/hash.ts`) must produce identical ids after the rename - backfill idempotency depends on it. Do not change hash inputs.
- Postgres rename via `ALTER TABLE ... RENAME` (+ constraint/index renames), never drop-and-recreate - production rows exist.
- RLS state on the renamed table must be preserved (verify with `\d+` equivalent or a migration test).
- Old `/brands` routes 308-redirect to `/prospects` (operators have bookmarks).
- No em dash in new docs; use "-".

## Required reading before code changes

- `packages/db/prisma/schema.prisma` - the `Brand` model and every relation to it (`DemoConfig.brandId`, `Transaction.brandId`).
- `apps/dashboard/src/lib/services/` - `BrandService` and its consumers; `demo-config-mappers/` (brand resolution).
- `apps/dashboard/src/lib/actions/` - all 6 demo-type action files route brand resolution.
- `apps/dashboard/scripts/backfill-brands/` - hash + backfill entry (`pnpm --filter @dynamic-demos/dashboard backfill:brands`).
- `apps/dashboard/src/app/(operator)/brands/` - routes/UI.
- `apps/dashboard/src/lib/normalize-logo.ts` - reads brand profile `logoUrl`.
- `apps/dashboard/AGENTS.md`, `packages/db/AGENTS.md`.

## What needs to happen

### Step 1 - Survey

Enumerate every reference: `rg -l 'Brand|brandId|brands' packages/db apps/dashboard packages/transactions --type ts --type prisma`. Classify each hit: model/FK, service, action, mapper, route, script, doc, test. Document the survey in your working notes before editing. Watch for false positives (e.g. `branding.logo` config keys used by demo apps - those are **not** renamed; the demo-config JSON shape is a published contract with demo apps).

### Step 2 - Prisma migration

- Rename model `Brand` -> `Prospect`; keep `@@map` OFF (table renames to `Prospect`).
- Rename FKs: `DemoConfig.brandId` -> `prospectId`, `Transaction.brandId` -> `prospectId` (relation names too).
- Add `domain String?`, `notes String?`.
- Hand-write the migration SQL: `ALTER TABLE "Brand" RENAME TO "Prospect";` + `ALTER TABLE ... RENAME COLUMN "brandId" TO "prospectId";` + rename indexes/constraints + `ALTER TABLE "Prospect" ADD COLUMN "domain" TEXT; ... ADD COLUMN "notes" TEXT;`. Verify `prisma migrate diff` agrees the schema and DB match afterward.
- Confirm RLS remains enabled on the renamed table; if the rename drops policies, recreate them in the same migration.

### Step 3 - Code rename

- `BrandService` -> `ProspectService`, registered as `services.prospects` (keep method names; parity tests rename mechanically).
- Mappers/actions: `brandId` -> `prospectId`, `resolveBrand` -> `resolveProspect` (or the existing names' equivalents - follow what the survey found).
- `scripts/backfill-brands/` -> `scripts/backfill-prospects/`; package script `backfill:brands` -> `backfill:prospects` (keep the old script name as an alias for one release if other docs reference it).
- Routes: `(operator)/brands` -> `(operator)/prospects`; add `next.config.ts` (or route-level) 308 redirect `/brands` -> `/prospects` and `/brands/:path*` -> `/prospects/:path*`.
- The footer heart link on the public landing keeps working (it will be re-pointed to `/dashboard` in Phase 07 - do not change its target here; just make sure `/brands` redirects).

### Step 4 - Tests

- Rename existing brand parity/service tests; all must pass unchanged in substance.
- New: migration idempotency test for the hash (`hash(ownerId, primaryColor, logoUrl)` yields same id pre/post rename - fixture-based).
- New: `domain`/`notes` round-trip through `services.prospects` create/update.
- Redirect test: `/brands` -> `/prospects` (middleware/route test per existing patterns).

### Step 5 - Docs

- `apps/dashboard/AGENTS.md` + `packages/db/AGENTS.md`: Brand -> Prospect throughout, note the two new columns and the redirect.
- Add a decision entry to `../DECISIONS.md` if that file exists yet (create it with this as its first entry if not): "Prospect subsumes Brand - one record carries identity + theme."

## Acceptance criteria

- [ ] `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test` pass.
- [ ] Migration applies cleanly against a copy of the current schema state; `prisma migrate diff` shows no drift.
- [ ] No occurrences of `BrandService`/`services.brands` remain; `rg -w 'brandId' apps/dashboard packages/db` returns nothing (demo-config JSON `branding.*` keys excluded and untouched).
- [ ] `/brands` 308-redirects to `/prospects`.
- [ ] Deterministic hash parity test passes.
- [ ] spark26 untouched; demo apps untouched (their `branding` config contract is unchanged).
- [ ] AGENTS.md updated in this PR.

## PR title

`refactor(dashboard): Phase GTM-01 - rename Brand to Prospect`

## After merge

Update `../PROGRESS.md` Wave 1 row. Notify dispatcher that Phases 03 and 07 are unblocked (03 immediately; 07 also needs 04).

## Out of scope

- Any new GTM tables (Phase 03).
- Prospect list/detail UI redesign (Phase 07).
- Renaming the `branding` key inside demo-config JSON (published contract with demo apps - stays).
