# Phase 2 — Prisma + Supabase foundation

> **Self-contained agent prompt — multi-PR phase.** Read this entire file. Then `PLAN.md`, `DECISIONS.md`, `GLOSSARY.md`. This phase ships across multiple PRs (one per migration step) for safe staging.

---

## Your role

Establish durable, queryable storage for brands, demo configs, transactions, webhook events. Apps don't touch the DB — only the dashboard consumes `packages/db`.

This phase ships as **5+ logical PRs** in sequence:
1. PR 2-scaffold — create `packages/db` with Prisma + Supabase wiring (no migrations yet).
2. PR 2-brands — add `Brand` model + migration + dashboard service-layer integration.
3. PR 2-remittance — migrate `remittance_configs` (first per-demo-type migration). Includes brand FK.
4. PR 2-others — migrate remaining demo config types: earn, visa-direct, wallet, trade, deposit, shop, cross-border-ap-ar, checkouts. One PR per type (or batched if very small).
5. PR 2-transactions — migrate `transactions` + `webhook_events` tables. Largest, last.

Each PR is independently shippable.

## Wave + dependencies

- 2-scaffold can run in Wave 2 (parallel with provider packages).
- 2-brands depends on 2-scaffold merged.
- 2-remittance depends on 2-brands merged.
- 2-others can parallelize among themselves once 2-remittance proves the pattern.
- 2-transactions depends on Phase 1E (transactions package) merged.

## Skills

1. `superpowers:using-git-worktrees` — separate worktree per PR (`.worktrees/phase-2-<step>`).
2. `superpowers:writing-plans` — each PR's specific migration steps.
3. `superpowers:test-driven-development` — schema and backfill scripts have full test coverage.
4. `superpowers:verification-before-completion` — backfill correctness is the riskiest single piece of code in the project.
5. `superpowers:requesting-code-review`.

## Hard rules

- `apps/spark26/` zero-touch. spark26 keeps its Redis-only order store.
- `packages/db` consumed only by `apps/dashboard`. Apps never import (D-015).
- ORM: **Prisma**. Host: **Supabase**. (D-013)
- Two URLs always: `DATABASE_URL` (pooler, port 6543) for runtime, `DIRECT_URL` (port 5432) for migrations.
- Backfill scripts have unit tests covering malformed legacy data, missing fields, mixed-case hex, etc.
- Service-layer parity tests required: every migrated function must produce identical output across Redis and Postgres backends until Redis is removed for that record type.
- Existing demo URLs (with config IDs) must continue to work. Backfill creates Brand rows but config IDs don't change (Q-014).
- `prisma db push` is **forbidden in production**. Only `prisma migrate deploy`.

## Required reading

- `apps/dashboard/src/lib/services/` — current service abstraction layer.
- `apps/dashboard/src/lib/services/redis/` — current Redis implementations.
- `apps/dashboard/src/lib/types/dashboard.ts` — current record types.
- `apps/dashboard/src/lib/redis.ts` — Redis key conventions.
- `apps/dashboard/src/lib/actions/<demoType>.ts` — server actions per demo type.
- `DECISIONS.md` D-002, D-013, D-015, D-021.

---

## PR 2-scaffold — Prisma + Supabase wiring

### What needs to happen

#### 1. Create `packages/db`

```
packages/db/
  prisma/
    schema.prisma             # base schema, no models yet (or just BrandPlaceholder for build sanity)
  src/
    client.ts                 # serverless-safe Prisma singleton
    index.ts                  # re-exports prisma client + types
  AGENTS.md                   # stub
  package.json
  tsconfig.json
```

#### 2. `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"   // adjust per workspace conventions
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// Models added in subsequent PRs
```

#### 3. `src/client.ts`

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

#### 4. `apps/dashboard/.env.example`

Add `DATABASE_URL` and `DIRECT_URL` placeholders. Document in dashboard's existing env.ts validation.

#### 5. CI gate for migrations

Add a GitHub Actions job to `ci.yml`: when `packages/db/prisma/migrations/` changes, spin up Postgres in Docker and run `prisma migrate deploy --dry-run` (or equivalent) to validate the migration applies cleanly to a fresh DB.

#### 6. Document in dashboard's `lib/services/`

Create `apps/dashboard/src/lib/services/postgres/` directory with `index.ts` (empty placeholder). Adjacent to existing `redis/` directory. Service interface from `services/types.ts` becomes the parity contract.

### Acceptance criteria (PR 2-scaffold)

- [ ] `packages/db` builds and exports a working Prisma client (no models yet, but schema validates).
- [ ] Dashboard env validation includes `DATABASE_URL`, `DIRECT_URL`.
- [ ] CI gate exists for migration dry-runs.
- [ ] `apps/dashboard/src/lib/services/postgres/` placeholder created.
- [ ] No code uses `packages/db` yet — only the singleton exists.

### Commit plan (PR 2-scaffold)

1. `chore(db): scaffold @dynamic-demos/db with Prisma client singleton`
2. `chore(dashboard): add DATABASE_URL and DIRECT_URL env validation`
3. `ci(github): add migration dry-run gate`
4. `chore(dashboard): scaffold services/postgres placeholder`

### PR title

`chore(db): Phase 2 scaffold — Prisma + Supabase wiring`

---

## PR 2-brands — Brand model + backfill

### What needs to happen

#### 1. Add `Brand` model to `prisma/schema.prisma`

```prisma
model Brand {
  id            String   @id @default(cuid())
  ownerId       String
  name          String
  description   String?
  // theme
  primaryColor  String   // hex
  secondaryColor String?
  accentColor   String?
  // branding
  logoUrl       String?
  // bookkeeping
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([ownerId])
}
```

#### 2. Generate migration

```
pnpm --filter @dynamic-demos/db prisma migrate dev --name init_brand
```

#### 3. Service-layer integration

Implement `apps/dashboard/src/lib/services/postgres/brands.ts` mirroring `redis/brands.ts` (or create both if Redis didn't have brands).

Add a feature flag `USE_POSTGRES_BRANDS=true|false`. Default `false`. Both implementations live concurrently.

Service abstraction (`apps/dashboard/src/lib/services/index.ts`) returns Postgres or Redis based on the flag.

#### 4. Backfill script

`scripts/backfill-brands.ts`:
- Reads existing demo configs from Redis (remittance, earn, visa-direct, etc.).
- For each config with embedded theme/branding fields:
  - Create a `Brand` row with the embedded values, owner = config.ownerId.
  - Add a `brandId` field to that config record (not yet wired as FK in Redis; this is preparatory).
- Idempotent: re-running doesn't create duplicate brands; uses a deterministic Brand id derived from `(ownerId, primaryColor, logoUrl)` hash, or marks already-backfilled configs.

Write extensive unit tests for the backfill: malformed configs, missing fields, mixed-case hex, duplicate detection, partial-failure recovery.

#### 5. Smoke test

Run backfill against a dev Redis snapshot. Verify Brand count matches expected, no errors, idempotent.

### Acceptance criteria (PR 2-brands)

- [ ] `Brand` model in schema with migration generated.
- [ ] Postgres service implementation passes parity tests against Redis (where Redis had brands; otherwise Postgres-only).
- [ ] Backfill script with unit tests covering edge cases.
- [ ] Backfill smoke-tested against a dev environment.
- [ ] Feature flag `USE_POSTGRES_BRANDS` lets dashboard run on either backend.
- [ ] CI migration dry-run passes.

---

## PR 2-remittance — first per-demo-type migration

### What needs to happen

#### 1. Add `RemittanceConfig` model

```prisma
model RemittanceConfig {
  id          String   @id @default(cuid())
  ownerId     String
  name        String
  description String?
  brandId     String
  brand       Brand    @relation(fields: [brandId], references: [id])
  // demo-specific config fields go here — derive from current StoredRemittanceConfig
  config      Json     // residual fields not yet first-class
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([ownerId])
  @@index([brandId])
}
```

#### 2. Implement `apps/dashboard/src/lib/services/postgres/remittance.ts`

Mirror `redis/remittance.ts`. CRUD: create, get, list (by owner), update, delete.

#### 3. Backfill remittance configs

`scripts/backfill-remittance.ts`: reads each Redis remittance config, creates the Postgres row with `brandId` pointing to the brand backfilled in PR 2-brands. **Preserves config IDs.**

#### 4. Migrate `apps/remittance` (the demo app) to fetch from new endpoint

Endpoint `/api/remittance/[id]` continues to exist but now reads from Postgres when `USE_POSTGRES_REMITTANCE=true`. Existing Redis path stays for back-compat until flag flips in production.

#### 5. Parity tests

Service-layer parity: same input → same output for all CRUD operations across both backends. Block PR merge until all parity tests pass.

### Acceptance criteria (PR 2-remittance)

- [ ] `RemittanceConfig` model + migration.
- [ ] Backfill script with tests.
- [ ] Postgres service parity tests vs Redis.
- [ ] Existing demo URLs preserved.
- [ ] Feature flag default to Redis; production flip is a separate operation.

---

## PR 2-others — remaining demo config types

Repeat the PR 2-remittance pattern for each:
- `earn` (`EarnConfig`)
- `visa-direct` (`VisaDirectConfig`)
- `wallet` (`WalletConfig`)
- `trade` (`TradeConfig`)
- `deposit` (`DepositConfig`) — if present in dashboard
- `shop` (`ShopConfig`) — if present
- `cross-border-ap-ar` (`SandwichConfig`) — if present in dashboard
- `checkouts` (`CheckoutConfig`)

One PR per type. Or batch 2-3 if extremely small. Spark26 has no dashboard config and is excluded.

### Acceptance criteria (per PR)

Same shape as 2-remittance. Each migration is independently shippable.

---

## PR 2-transactions — transactions + webhook events

### What needs to happen

#### 1. Models

```prisma
model Transaction {
  id                  String   @id @default(cuid())
  kind                String   // 'checkout' | 'disbursement' | 'payout' | 'swap' | ...
  state               String   // canonical TransactionState
  demoInstanceId      String?
  brandId             String?
  parentTransactionId String?  @relation("ParentChild", references: [id])
  parent              Transaction?  @relation("ParentChild")
  children            Transaction[] @relation("ParentChild")
  payload             Json
  refs                Json     // extra refs not first-class
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  webhookEvents       WebhookEvent[]

  @@index([demoInstanceId])
  @@index([brandId])
  @@index([state])
}

model WebhookEvent {
  id                String   @id @default(cuid())
  provider          String
  providerEventId   String
  eventType         String
  occurredAt        DateTime
  receivedAt        DateTime @default(now())
  signatureValid    Boolean
  rawPayload        Json
  normalizedPayload Json
  transactionId     String?
  transaction       Transaction? @relation(fields: [transactionId], references: [id])
  demoInstanceId    String?
  brandId           String?
  processingStatus  String   @default("pending")
  processingError   String?
  processedAt       DateTime?

  @@unique([provider, providerEventId])
  @@index([transactionId])
  @@index([receivedAt])
}
```

#### 2. State validation at the data boundary

Postgres service for transactions calls into `@dynamic-demos/transactions`'s `assertValidTransition` before any state update. Database stores the canonical string; runtime validates.

#### 3. Backfill transactions (if any exist in Redis worth migrating)

If dashboard's existing Redis-backed transactions are demo-only and ephemeral, **skip the backfill** — start fresh in Postgres. Document the decision.

#### 4. WebhookEvent table integration with Phase 5A

Phase 5A's webhook receiver framework writes to this table. This PR provides the schema and service interface; Phase 5A consumes.

### Acceptance criteria (PR 2-transactions)

- [ ] Transaction + WebhookEvent models with migration.
- [ ] Service implementation with `assertValidTransition` integration.
- [ ] If backfill: tests + smoke. If skipped: documented.
- [ ] Feature flags toggle on for new writes only.

---

## Common acceptance criteria (every PR in Phase 2)

- [ ] CI gates pass.
- [ ] `apps/spark26/` untouched.
- [ ] `packages/db` consumed only by `apps/dashboard`.
- [ ] Backfill (where applicable) has unit tests and idempotency guarantees.
- [ ] Existing demo URLs preserved.
- [ ] Service-layer parity tests pass.

## PR title pattern

- `feat(db): Phase 2 scaffold — Prisma + Supabase wiring`
- `feat(db): Phase 2 — Brand model + backfill`
- `feat(db): Phase 2 — RemittanceConfig migration`
- `feat(db): Phase 2 — <DemoType>Config migration`
- `feat(db): Phase 2 — Transaction + WebhookEvent models`

After each PR merges, update the corresponding PROGRESS.md row.
