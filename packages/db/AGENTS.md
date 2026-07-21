---
name: "@dynamic-demos/db"
kind: package
flow_role: utility
custody: n/a
status: stable
---

# @dynamic-demos/db

Prisma + Supabase Postgres access layer: a serverless-safe `PrismaClient`
singleton, the schema definition, and the migration history.

## Hard rule: single consumer

**Only `apps/dashboard` imports from this package** (D-015). Demo apps read
configuration from the dashboard HTTP API and persist transient state in
Redis. If a demo app needs data, add an endpoint under
`apps/dashboard/src/app/api/orchestrate/...` and fetch it.

`apps/spark26/` is zero-touch (D-006) and explicitly excluded.

## Public surface

- `prisma` - singleton `PrismaClient` with delegates for every declared
  model: `prospect`, `transaction`, `webhookEvent`, `demoConfig`, `user`,
  `shareLink`, `visitorSession`, `trackEvent`, `team`, `teamMembership`,
  `prospectTheme`. (stable)
- `Prisma` - namespace re-export from `@prisma/client` for input/output
  typing (e.g. `Prisma.ProspectCreateInput`). (stable)
- `PrismaClient` - class re-export; prefer the singleton. (stable)

### Models at a glance

- `Prospect` - first-class prospect record: identity (`name`, nullable
  `domain`, `notes`), flat palette columns, logo discriminator, linked
  demo-config ids, `teamId` (FK, NOT NULL, default team), `createdById`
  (nullable FK to `User`), `status ProspectStatus`. Partial unique index on
  `(teamId, lower(domain))` lives in raw SQL and is Prisma-invisible.
  Service: `postgres/prospects.ts`, flag `USE_POSTGRES_PROSPECTS`.
  Dual-write rule: every create/update writes BOTH the flat palette columns
  and the `ProspectTheme` row (create prospect-first for the FK; update
  theme-first so a crash never leaves a stale theme readable). Reads let an
  existing `ProspectTheme` row win wholesale, flat columns are the fallback.
- `Team` / `TeamMembership` - workspace + `(userId, teamId)`-unique
  membership (no per-membership role yet; default team slug `gtm`).
  Service: `postgres/teams.ts` as `services.teams`.
- `ProspectTheme` - 1:1 palette for a `Prospect` (`prospectId` unique FK,
  `ON DELETE CASCADE`); identity stays on `Prospect`. Populated by
  `backfill:prospect-themes` and kept in sync by every prospect write.
- `DemoConfig` - unified per-instance config carrier for every demo type
  (earn, wallet, trade, visa-direct, checkout, remittance). `kind` is a
  TEXT discriminator validated app-side via a Zod discriminated union, NOT
  a Prisma enum - a new demo type is a Zod/type edit, not a migration
  (D-013). `prospectId` is a nullable FK to `Prospect` (D-028): `null`
  means unbound/showcase; mappers never hash-resolve or auto-create a
  Prospect on write. `createdById` (nullable FK) is stamped on create.
  Optional `themeOverrides Json?` merges on top of the prospect theme at
  the service boundary. Indexed on `ownerId`, `prospectId`, `kind`,
  `(ownerId, kind)`. Service: `postgres/demo-configs.ts`, flag
  `USE_POSTGRES_DEMO_CONFIGS`.
- `Transaction` - canonical "money in flight" record (D-010). State is
  validated by `assertValidTransition` at the service boundary; the DB
  stores it verbatim. Self-FK for multi-leg flows. Indexed on
  `demoInstanceId`, `prospectId`, `state`, `parentTransactionId`.
  Service: `postgres/transactions.ts`, flag `USE_POSTGRES_TRANSACTIONS`.
- `WebhookEvent` - audit row per received webhook (D-011). Unique on
  `(provider, providerEventId)` for dedup. Optional FK to `Transaction`
  with `ON DELETE SET NULL`. Postgres-only.
- `User` - the single internal-person entity, created lazily on first
  verified sign-in. `email` unique. `dynamicUserId` (Dynamic JWT `sub`) is
  nullable/unique and write-once - it joins this row to the `ownerId`
  values stored on `Prospect`/`DemoConfig`, which are never rewritten.
  `role` is the Prisma `Role` enum (`OWNER | ADMIN | MEMBER | VIEWER`,
  default `MEMBER`). `deactivatedAt DateTime?` marks offboarding.
  `services.users.claimLegacyRecords(user)` is the idempotent
  `createdById` reconciliation hook. Service: `postgres/users.ts` as
  `services.users` (the legacy per-checkout wallet-user Redis service is
  `services.legacyWalletUsers`), Postgres-only.
- `ShareLink` - per-prospect, per-demo share link. `token` (`nanoid(21)`,
  url-safe) unique. FK `userId` -> `User`; `demoConfigId` / `prospectId`
  are deliberately unconstrained scalars (decoupled-lifetime pattern) -
  `mint` verifies both exist at the service layer. Service:
  `postgres/share-links.ts`.
- `VisitorSession` / `TrackEvent` - session + event rows for the GTM
  tracker (`packages/analytics`). Both ids are client-generated UUIDs with
  no `@default` - every insert is upsert/`skipDuplicates` idempotent.
  `TrackEvent.sessionId` FKs `VisitorSession`; `VisitorSession.shareLinkId`
  FKs `ShareLink` (`ON DELETE SET NULL`). Indexed on `shareLinkId`,
  `(demoSlug, startedAt)`, `(sessionId, ts)`. Write-only service:
  `postgres/visitor-sessions.ts`; read/aggregate queries are a later phase.

## Required environment

- `DATABASE_URL` - Supabase pooler URL, port 6543, runtime - required
- `DIRECT_URL` - Supabase direct URL, port 5432, migrations only - required

D-013: the pooler URL is mandatory at runtime to avoid exhausting
serverless connections; the direct URL is mandatory for migrations because
the pooler does not support DDL transactions.

Sandbox-by-default (D-005): point both at a local or sandbox Supabase
project for dev. Production opt-in only via explicit env override.

## Slots vs invariants

**Slots**

- Connection string targets (sandbox vs prod Supabase project).
- Log level (configured via `NODE_ENV`).

**Invariants**

- The Prisma client is a singleton at module scope (D-013, serverless-safe).
- `DATABASE_URL` is the pooler; `DIRECT_URL` is the direct connection.
  Never swap them.
- `prisma db push` is forbidden in production; only `prisma migrate deploy`.
- This package is consumed only by `apps/dashboard` (D-015).

## Integration map

**Imports:** `@prisma/client`
**Imported by:** `apps/dashboard` (only)

## Examples

```ts
import { prisma } from "@dynamic-demos/db";

export async function listDemoConfigs(ownerId: string, kind: string) {
  return prisma.demoConfig.findMany({
    where: { ownerId, kind },
    orderBy: { createdAt: "asc" },
  });
}
```

## Do / Don't

- Do: import `prisma` from `@dynamic-demos/db` in dashboard server code.
- Do: run `pnpm --filter @dynamic-demos/db prisma:generate` after pulling
  schema changes.
- Don't: import this package from any app other than `apps/dashboard`.
- Don't: instantiate `new PrismaClient()` ad hoc; use the singleton so
  connection pooling stays correct.
- Don't: run `prisma db push` in production; CI rejects it.
- Don't: add a Prisma enum for `DemoConfig.kind` - the closed set lives in
  `apps/dashboard/src/lib/services/demo-config-schemas.ts` so a new kind
  doesn't need a migration.

## Open questions / known gaps

- Contract phase pending: the flat palette columns on `Prospect` duplicate
  `ProspectTheme` until a follow-up drops them (three-deploy rule: remove
  deprecated Prisma fields first, drop columns after).
- `USE_POSTGRES_TRANSACTIONS` is not yet enabled anywhere; the
  `Transaction` cutover is unfinished.
- Backfills (`backfill:prospects`, `backfill:demo-configs`,
  `backfill:prospect-themes`, `backfill:users`) are idempotent and safe to
  re-run.
- RLS is enabled on every table in the migration that creates it. Prisma
  connects as superuser and bypasses it; service-layer ownership checks
  remain the trust boundary. `packages/db/scripts/replay-check.sh`
  (local-only) replays all migrations and asserts an empty `migrate diff`.
