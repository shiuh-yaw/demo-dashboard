---
name: "@dynamic-demos/db"
kind: package
flow_role: utility
custody: n/a
status: stable
---

# @dynamic-demos/db

Prisma + Supabase Postgres access layer. Provides a serverless-safe
`PrismaClient` singleton and the schema definition. Models landed
incrementally: `Brand` (2-brands), `Transaction` + `WebhookEvent`
(2-transactions), `DemoConfig` (2-demo-configs — unified per-demo-type
carrier; remittance folded in via `fold_remittance_into_demo_config`).

## Hard rule: single consumer

**Only `apps/dashboard` imports from this package** (D-015). Every demo app
under `apps/<name>/` reads configuration from the dashboard HTTP API and
persists transient state in Redis. Importing `@dynamic-demos/db` from any
other app or package is a violation that CI will eventually enforce.

If you find yourself wanting to import this in a demo app, the right fix is
to add an endpoint under `apps/dashboard/src/app/api/orchestrate/...` and
fetch from that endpoint instead.

`apps/spark26/` is zero-touch (D-006) and explicitly excluded.

## Capabilities

- Exports a serverless-safe Prisma singleton (`prisma`).
- Re-exports `Prisma` and `PrismaClient` types from `@prisma/client`.
- Owns `prisma/schema.prisma` and the migration history under `prisma/migrations/`.

## Public surface

- `prisma` — singleton `PrismaClient` with delegates for every declared
  model: `prisma.brand`, `prisma.transaction`, `prisma.webhookEvent`,
  `prisma.demoConfig`. (stable)
- `Prisma` — namespace re-exported from `@prisma/client` for input/output
  typing (e.g., `Prisma.BrandCreateInput`). (stable)
- `PrismaClient` — class re-export for callers that need their own instance
  (rare; prefer the singleton). (stable)

### Models at a glance

- `Brand` — first-class brand record (2-brands). Full visual theme + logo
  discriminator + linked demo-config ids. Service:
  `apps/dashboard/src/lib/services/postgres/brands.ts`, flag
  `USE_POSTGRES_BRANDS`.
- `DemoConfig` — unified per-instance config carrier for every demo type
  (earn, wallet, trade, visa-direct, checkout, remittance). `kind` is a
  TEXT discriminator validated app-side via a Zod discriminated union, **not**
  a Prisma enum — adding a new demo type is a Zod/Type edit, not a migration
  (D-013, meta-system goal). FK `brandId` → `Brand` (D-028); optional
  `themeOverrides Json?` merges on top of the brand theme at the service
  boundary. Indexed on `ownerId`, `brandId`, `kind`, `(ownerId, kind)`.
  Service: `apps/dashboard/src/lib/services/postgres/demo-configs.ts`,
  flag `USE_POSTGRES_DEMO_CONFIGS`. Replaces what would otherwise be one
  table per demo type; legacy `RemittanceConfig` rows were migrated here
  with `kind="remittance"` and the legacy table dropped (D-029).
- `Transaction` — canonical "money in flight" record (D-010). State
  validated by `assertValidTransition` at the service boundary; DB stores
  verbatim. Indexed on `demoInstanceId`, `brandId`, `state`,
  `parentTransactionId`. Self-FK for multi-leg flows. Service:
  `apps/dashboard/src/lib/services/postgres/transactions.ts`, flag
  `USE_POSTGRES_TRANSACTIONS`.
- `WebhookEvent` — audit row for every received webhook (D-011). Unique on
  `(provider, providerEventId)` for dedup. Optional FK to `Transaction`
  with `ON DELETE SET NULL`. Postgres-only by design. Phase 5A's webhook
  receiver framework is the consumer.

## Required environment

- `DATABASE_URL` — Supabase pooler URL, port 6543, runtime — required
- `DIRECT_URL` — Supabase direct URL, port 5432, migrations only — required

D-013: pooler URL is mandatory for runtime to avoid exhausting serverless
connections; direct URL is mandatory for migrations because the pooler
does not support DDL transactions.

Sandbox-by-default (D-005): point both at a local or sandbox Supabase
project for dev. Production opt-in only via explicit env override.

## Slots vs invariants

**Slots**

- Connection string targets (sandbox vs prod Supabase project).
- Log level (configured via `NODE_ENV`).

**Invariants**

- The Prisma client is a singleton at module scope (D-013 — serverless-safe).
- `DATABASE_URL` is the pooler; `DIRECT_URL` is the direct connection. Never
  swap them.
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
- Don't: instantiate `new PrismaClient()` ad hoc in dashboard code; use the
  exported singleton so connection pooling stays correct.
- Don't: run `prisma db push` in production; CI rejects it.
- Don't: add a Prisma enum for `DemoConfig.kind` — the closed set lives in
  `apps/dashboard/src/lib/services/demo-config-schemas.ts` so a new kind
  doesn't need a migration.

## Open questions / known gaps

- Action-layer cutover: legacy `lib/actions/{earns,wallets,trade,visa-direct,
  checkouts,remittance}.ts` still write to per-type Redis stores. A
  follow-up PR routes them through `DemoConfigService`.
- `RemittanceConfig` ↔ `DemoConfig` fold: **done** — legacy table dropped
  by `fold_remittance_into_demo_config`; rows live in `DemoConfig` with
  `kind="remittance"` and the unified backfill handles them.
- Backfills: brand (`backfill:brands`) and unified demo-configs
  (`backfill:demo-configs` — covers every kind including remittance).
  Both idempotent — deterministic Brand id from
  `(ownerId, primaryColor, logoUrl)` and preserved legacy ids (Q-014).
- RLS is enabled on every Phase-2 table. Prisma connects as superuser and
  bypasses it; service-layer ownership checks remain the trust boundary.
