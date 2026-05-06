---
name: "@dynamic-demos/db"
kind: package
flow_role: utility
custody: n/a
status: stable
---

# @dynamic-demos/db

Prisma + Supabase Postgres access layer for the demo monorepo. Provides a
serverless-safe `PrismaClient` singleton and the schema definition. The
first real model — `Brand` — landed in PR 2-brands (Part A). The canonical
`Transaction` and `WebhookEvent` pair landed in PR 2-transactions.
Per-demo-type configs ship in subsequent PRs, each gated by its own
migration so a flag-flipped rollout is incremental.

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
- Owns the `prisma/schema.prisma` source of truth and the generated migration
  history under `prisma/migrations/`.
- Models: `Brand` (PR 2-brands Part A), `Transaction` and `WebhookEvent`
  (PR 2-transactions).

## Public surface

- `prisma` — singleton `PrismaClient` instance with delegates for every
  declared model: `prisma.brand`, `prisma.transaction`, `prisma.webhookEvent`.
  (stable)
- `Prisma` — namespace re-exported from `@prisma/client` for input/output
  typing (e.g., `Prisma.BrandCreateInput`, `Prisma.TransactionCreateInput`).
  (stable)
- `PrismaClient` — class re-exported from `@prisma/client` for callers that
  need to construct their own instance (rare; prefer the singleton). (stable)

### Models at a glance

- `Brand` — first-class brand record (PR 2-brands Part A). Indexed on
  `ownerId`. Service: `apps/dashboard/src/lib/services/postgres/brands.ts`,
  flag `USE_POSTGRES_BRANDS`.
- `Transaction` — canonical "money in flight" record (D-010). State string
  is validated by `assertValidTransition` from `@dynamic-demos/transactions`
  at the service-layer boundary; the DB stores the value verbatim. Indexed
  on `demoInstanceId`, `brandId`, `state`, `parentTransactionId`. Self-FK
  for multi-leg flows (parent ↔ children). Service:
  `apps/dashboard/src/lib/services/postgres/transactions.ts`, flag
  `USE_POSTGRES_TRANSACTIONS`. Note: distinct from the legacy LI.FI
  `Transaction` shape stored in Redis under
  `apps/dashboard/src/lib/services/redis/transactions.ts`; the two coexist
  intentionally and the legacy shape stays Redis-only.
- `WebhookEvent` — audit row for every received webhook (D-011). Unique
  on `(provider, providerEventId)` for dedup. Indexed on `transactionId`,
  `receivedAt`, `processingStatus`. Optional FK to `Transaction` with
  `ON DELETE SET NULL`. Service:
  `apps/dashboard/src/lib/services/postgres/webhook-events.ts` —
  Postgres-only by design (no Redis parity backend). Phase 5A's webhook
  receiver framework is the consumer.

## Required environment

- `DATABASE_URL` — Supabase pooler URL, port 6543, used at runtime — required
- `DIRECT_URL` — Supabase direct URL, port 5432, used by `prisma migrate` — required

D-013: pooler URL is mandatory for runtime to avoid exhausting connections in
serverless. Direct URL is mandatory for migrations because the pooler does
not support DDL transactions.

Sandbox-by-default (D-005): for local dev point both at a local or sandbox
Supabase project. Production opt-in only via explicit env override.

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

export async function listBrandsForOwner(ownerId: string) {
  return prisma.brand.findMany({
    where: { ownerId },
    orderBy: { createdAt: "asc" },
  });
}
```

## Do / Don't

- Do: import `prisma` from `@dynamic-demos/db` in dashboard server code.
- Do: run `pnpm --filter @dynamic-demos/db prisma:generate` after pulling
  schema changes; the generated client lives under the package's own
  `node_modules`.
- Don't: import this package from any app other than `apps/dashboard`.
- Don't: instantiate `new PrismaClient()` ad hoc in dashboard code; use the
  exported singleton so connection pooling stays correct.
- Don't: run `prisma db push` in production; CI rejects it.

## Open questions / known gaps

- Pending models: per-demo-type configs (`RemittanceConfig`, `EarnConfig`,
  `VisaDirectConfig`, `WalletConfig`, `TradeConfig`, `DepositConfig`,
  `ShopConfig`, `SandwichConfig`, `CheckoutConfig`). Each lands in its
  own PR with its own migration so a flag flip is per-domain.
- Brand backfill (read existing demo configs in Redis, materialise Brand
  rows) is deferred to PR 2-brands Part B. Until then `prisma.brand` is
  the only writer and the table starts empty in every environment.
- Transaction backfill: PR 2-transactions intentionally **skips** the
  backfill. The legacy LI.FI-checkout-bound `Transaction` shape (Redis,
  with `txHash`, etc.) is a different model — migrating it loses info
  for no benefit on ephemeral demo data. New txs write to Postgres only
  when `USE_POSTGRES_TRANSACTIONS=true`.
- Row-level security (RLS) is enabled on every Phase-2 table at the
  migration level (see memory `project_postgres_rls_pattern`). Prisma
  connects as the `postgres` superuser and bypasses RLS, so service-layer
  ownership checks remain the trust boundary; RLS-on hardens against a
  future Supabase anon-key consumer drifting in.
