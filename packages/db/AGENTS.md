---
name: db
kind: package
flow_role: utility
custody: n/a
status: stub
---

# @dynamic-demos/db

Prisma + Supabase Postgres access layer for the demo monorepo. Provides a
serverless-safe `PrismaClient` singleton and the schema definition. The
schema currently has no models — it lands as a scaffold so subsequent PRs
(brands, remittance, transactions, etc.) can each ship one model + migration
in isolation.

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
  history under `prisma/migrations/` (added in subsequent PRs).

## Public surface

- `prisma` — singleton `PrismaClient` instance. (stable)
- `Prisma` — namespace re-exported from `@prisma/client` for input/output
  typing. (stable)
- `PrismaClient` — class re-exported from `@prisma/client` for callers that
  need to construct their own instance (rare; prefer the singleton). (stable)

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
  // Uncomment once the Brand model lands in PR 2-brands.
  // return prisma.brand.findMany({ where: { ownerId } });
  return [];
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

- No models yet. Brand lands in PR 2-brands; per-demo-type configs follow;
  Transaction + WebhookEvent ship last (PR 2-transactions).
- No CI migration dry-run gate yet for actual migration files because there
  are no migrations. The workflow ships in this PR (Phase 2 scaffold) and
  becomes meaningful once PR 2-brands generates the first migration.
- Row-level security (RLS) is deferred. Service-layer ownership checks in
  `apps/dashboard/src/lib/services/postgres/` are the trust boundary until
  RLS is layered on (potential Phase 8).
