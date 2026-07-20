# Phase 03 - GTM Prisma models + services

> **Self-contained agent prompt.** Read this entire file, then `../DESIGN.md`, `../PLAN.md` (Shared contracts - the Prisma models there are binding, copy them verbatim), and `docs/projects/demo-meta-system/DECISIONS.md` (D-013, D-015).

## Your role

Add the four GTM tables - `Profile`, `ShareLink`, `VisitorSession`, `TrackEvent` - to `packages/db`, with RLS enabled, plus the dashboard service layer for profiles and share links. Sessions/events write-services land here too (Phase 06 consumes them); analytics read-services are Phase 08.

One logical PR.

## Wave + dependencies

- Wave 2, after Phase 01 (ShareLink FKs `Prospect`). Blocks 04, 05, 06.

## Skills to use

1. `superpowers:using-git-worktrees` - `.worktrees/gtm-03-schema`, branch `gtm/03-gtm-schema`.
2. `superpowers:test-driven-development`.
3. `superpowers:verification-before-completion`, `superpowers:requesting-code-review`.

## Hard rules

- Models copied verbatim from `../PLAN.md` Shared contracts. If you must deviate (a Prisma constraint you hit), update PLAN.md's contract section in the same PR and call it out in the PR description.
- **RLS enabled on all four tables in the same migration that creates them** (`ALTER TABLE "..." ENABLE ROW LEVEL SECURITY;` - follow the exact pattern of the existing Phase-2 migrations in `packages/db/prisma/migrations/`).
- Dashboard remains the only `@dynamic-demos/db` consumer (D-015).
- `VisitorSession.id` and `TrackEvent.id` are client-generated UUIDs - no `@default`; inserts must be idempotent-friendly.
- Token generation: `nanoid(21)` url-safe. Never `Math.random()`.

## Required reading before code changes

- `packages/db/prisma/schema.prisma` + latest migrations (RLS pattern, naming conventions).
- `apps/dashboard/src/lib/services/` - how existing services (`demoConfigs`, `prospects` post-Phase-01) are structured, registered, and tested. Match that pattern exactly.
- `../PLAN.md` Services contract (method names are binding for Phases 04/05/06).

## What needs to happen

1. **Schema**: append the four models; run `prisma migrate dev --name gtm_tables`; hand-append the RLS statements to the generated migration.
2. **Services** (`apps/dashboard/src/lib/services/`):
   - `profiles.ts` - `getOrCreateByEmail(email)` (normalizes to lowercase; creates with `role: "se"`), `update(id, { displayName, schedulingUrl, avatarUrl })` (validates `schedulingUrl` is https via zod), `setRole(id, role)` (used by Phase 04 seeding).
   - `share-links.ts` - `mint({ demoConfigId, prospectId, profileId })` (verifies the demoConfig and prospect exist; generates token), `resolveByToken(token)` (returns null unless `status === "active"` and not expired; includes `profile` + `prospect` relations for Phase 05's context endpoint), `revoke(id)`.
   - `visitor-sessions.ts` - `upsertFromBatch(batch, meta): Promise<{ created: boolean }>` where `meta = { geo: { country?, region?, city? }, ua: { device?, os?, browser? }, ipHash: string, shareLinkId: string | null, isInternal: boolean }`: upsert session by `id` (create with meta, update `lastSeenAt` to max event ts; `created` reports whether the row was newly inserted - Phase 10's enrichment hook depends on it), then `createMany` events with `skipDuplicates: true`. `heartbeat`-named events advance `lastSeenAt` but are NOT persisted as TrackEvent rows.
   - Register all three under the `services` aggregate the way existing services are.
3. **Tests** (follow the existing service-test pattern in the repo - if services are tested against mocks, mock; if against a test schema, do that):
   - profiles: create-then-get idempotency, email normalization, schedulingUrl validation rejects `javascript:`/http.
   - share-links: mint produces 21-char token; resolve ignores revoked/expired; revoke flips status.
   - visitor-sessions: batch upsert creates session + events; duplicate event ids are silently skipped; heartbeat advances lastSeenAt without an event row; second batch updates lastSeenAt only forward (never backward).
4. **Docs**: `packages/db/AGENTS.md` + `apps/dashboard/AGENTS.md` gain the four tables + services. `.env.example` untouched (no new env in this phase).

## Acceptance criteria

- [ ] `pnpm turbo typecheck && lint && test` pass.
- [ ] Migration includes RLS enablement for all four tables (grep the migration SQL in review).
- [ ] Service method signatures match `../PLAN.md` contracts exactly.
- [ ] Heartbeat events never appear in `TrackEvent`.
- [ ] AGENTS.md updated in this PR. spark26 untouched.

## PR title

`feat(db): Phase GTM-03 - Profile, ShareLink, VisitorSession, TrackEvent`

## After merge

Update `../PROGRESS.md`. Unblocks 04 immediately; 05 needs 04; 06 needs 02.

## Out of scope

- Auth wiring (04), endpoints (05/06), aggregate/read queries (08), any UI.
