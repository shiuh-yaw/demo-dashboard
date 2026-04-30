# Phase 5B — Orchestration API

> **Self-contained agent prompt.** Read this entire file. Then `PLAN.md`, `DECISIONS.md`, `GLOSSARY.md`.

---

## Your role

Generalize the dashboard's scattered API endpoints into a coherent `/api/orchestrate/*` namespace that demo apps call for commodity-provider operations. Apps pass demo instance + JWT; dashboard resolves which provider/env to use based on the demo's config and calls the package, persists state, returns canonical response.

Ships as **one logical PR**.

## Wave + dependencies

- Wave 4.
- Depends on Phase 1B providers (alfredpay, blindpay, iron, coinbase-onramp, lifi all extracted).
- Depends on Phase 1E (transactions package).
- Depends on Phase 2 (`Transaction` model in Postgres).

## Skills

1. `superpowers:using-git-worktrees` — `.worktrees/phase-5b-orchestration`.
2. `superpowers:writing-plans`.
3. `superpowers:test-driven-development` — endpoint contracts have full coverage.
4. `superpowers:verification-before-completion`.
5. `superpowers:requesting-code-review`.

## Hard rules

- `apps/spark26/` zero-touch.
- Apps don't access the DB; the dashboard's orchestration endpoints are the only HTTP surface for commodity-provider operations.
- **Dynamic and Fireblocks are NOT orchestrated** (D-003) — apps call those directly using their own credentials. Orchestration covers only: alfredPay-direct REST, BlindPay, Iron, Coinbase Onramp, LI.FI.
- Per-request JWT verification with `x-dynamic-environment-id` header (D-004).
- Sandbox-by-default (D-005).
- State transitions through `@dynamic-demos/transactions` helpers.

## Required reading

- `apps/dashboard/src/app/api/checkouts/[id]/transactions/` — existing transaction endpoint shape.
- `apps/dashboard/src/lib/dynamic/dynamic-auth.ts` — JWT verification with header-based env.
- `packages/<provider>/src/index.ts` — for each commodity provider.
- `packages/transactions/src/index.ts`.
- `DECISIONS.md` D-001, D-003, D-004, D-005, D-010.

## What needs to happen

### 1. Define endpoint contracts

`apps/dashboard/src/app/api/orchestrate/`:

| Endpoint | Method | Purpose | Body shape |
|---|---|---|---|
| `/quotes` | POST | Quote for an onramp/offramp/swap | `{ demoInstanceId, kind: 'onramp'\|'offramp'\|'swap', source, destination, amount }` |
| `/onramp` | POST | Start an onramp | `{ demoInstanceId, source, destination, amount, walletAddress }` |
| `/offramp` | POST | Start an offramp | `{ demoInstanceId, source, destination, amount, payoutDetails }` |
| `/swap` | POST | Cross-chain bridge/swap | `{ demoInstanceId, sourceChain, destChain, asset, amount }` |
| `/transactions/:id` | GET | Status check | — |
| `/wallets/verify` | POST | Wallet verification | `{ demoInstanceId, walletAddress, ownerName }` |

Every endpoint:
- Requires `Authorization: Bearer <jwt>` + `x-dynamic-environment-id: <demo-app-env-id>`.
- Looks up `demoInstanceId` to determine which provider + env to use.
- Calls into the appropriate provider package.
- Persists to `Transaction` table with state-machine validation.
- Returns canonical `Transaction` shape.

### 2. Per-endpoint implementation

#### Shared middleware

`apps/dashboard/src/lib/orchestrate/auth.ts`:

```ts
export async function authenticateOrchestrate(req: Request): Promise<{
  user: AuthenticatedUser;
  demoEnvironmentId: string;
}> {
  const envId = req.headers.get('x-dynamic-environment-id');
  if (!envId) throw new MissingEnvIdError();
  const user = await getAuthenticatedUser(req, envId);
  return { user, demoEnvironmentId: envId };
}
```

#### Provider resolver

`apps/dashboard/src/lib/orchestrate/resolve-provider.ts`:

Given a `demoInstanceId` + operation kind (onramp/offramp/swap), resolves which provider package to call. Reads the demo's config + the provider registry.

```ts
export async function resolveProvider(opts: {
  demoInstanceId: string;
  kind: 'onramp' | 'offramp' | 'swap';
}): Promise<{ provider: ProviderClient; env: 'sandbox' | 'production' }> { ... }
```

Provider clients are instantiated once at module load (singletons keyed by env).

#### Per-endpoint handler

```ts
// apps/dashboard/src/app/api/orchestrate/offramp/route.ts
import { authenticateOrchestrate } from '@/lib/orchestrate/auth';
import { resolveProvider } from '@/lib/orchestrate/resolve-provider';
import { prisma } from '@dynamic-demos/db';
import { TransactionState, submit } from '@dynamic-demos/transactions';

export async function POST(req: Request) {
  const { user, demoEnvironmentId } = await authenticateOrchestrate(req);
  const body = OfframpRequestSchema.parse(await req.json());

  const { provider, env } = await resolveProvider({
    demoInstanceId: body.demoInstanceId,
    kind: 'offramp',
  });

  // Create transaction in 'initialized' state, transition to 'submitted'
  let tx = await prisma.transaction.create({ data: {
    kind: 'offramp',
    state: TransactionState.initialized,
    refs: { demoInstanceId: body.demoInstanceId },
    payload: body,
  }});
  tx = await prisma.transaction.update({
    where: { id: tx.id },
    data: submit(tx),
  });

  // Call provider
  const result = await provider.createOfframp({ ...body, env });

  return Response.json({ transaction: tx, providerResult: result });
}
```

### 3. Per-endpoint Zod request schemas

In `apps/dashboard/src/lib/orchestrate/schemas/`:
- `quotes.ts`
- `onramp.ts`
- `offramp.ts`
- `swap.ts`
- `wallet-verify.ts`

Strict Zod validation; endpoints reject malformed requests with 400 + helpful error.

### 4. Per-endpoint tests

`apps/dashboard/src/app/api/orchestrate/<endpoint>/__tests__/route.test.ts`:
- Valid request → 200, transaction created, provider called.
- Missing `x-dynamic-environment-id` → 400.
- Invalid JWT → 401.
- Invalid demoInstanceId → 404.
- Provider call fails → 500 + transaction in `failed` state.
- Sandbox-by-default verified — endpoint hits sandbox provider URL unless explicit prod opt-in.

Mock provider clients via MSW or vi.fn().

### 5. Migrate existing scattered endpoints

Existing `apps/dashboard/src/app/api/checkouts/[id]/transactions/...` and similar endpoints continue to exist (back-compat), but new code uses `/api/orchestrate/*`. Document this in dashboard's AGENTS.md:

- Existing endpoints are deprecated but supported.
- New demo apps should call `/api/orchestrate/*`.
- Migration of existing apps to the new namespace happens lazily as each app is touched in subsequent phases.

### 6. Documentation

Add `docs/engineering/orchestration-api.md` documenting:
- Each endpoint's contract (body, response, error codes).
- The header convention (`x-dynamic-environment-id`).
- How to add a new endpoint (the pattern).
- The provider resolver and how the demo's config drives it.

## Acceptance criteria

- [ ] All 6 endpoints (`/quotes`, `/onramp`, `/offramp`, `/swap`, `/transactions/:id`, `/wallets/verify`) exist under `/api/orchestrate/`.
- [ ] Authentication middleware shared.
- [ ] Provider resolver reads from demo config.
- [ ] Zod schemas for every request body.
- [ ] State machine integration (transactions persisted with valid transitions).
- [ ] Sandbox-by-default verified in tests.
- [ ] Documentation at `docs/engineering/orchestration-api.md`.
- [ ] Existing scattered endpoints continue to work (back-compat).
- [ ] Tests cover happy paths + auth failures + provider failures.
- [ ] CI gates pass.

## Commit plan

1. `feat(orchestrate): add shared auth middleware + provider resolver`
2. `feat(orchestrate): add /quotes endpoint`
3. `feat(orchestrate): add /onramp endpoint`
4. `feat(orchestrate): add /offramp endpoint`
5. `feat(orchestrate): add /swap endpoint`
6. `feat(orchestrate): add /transactions/:id endpoint`
7. `feat(orchestrate): add /wallets/verify endpoint`
8. `test(orchestrate): full coverage across endpoints`
9. `docs(engineering): orchestration-api reference`

## PR title

`feat(orchestrate): Phase 5B — orchestration API surface`

## PR description

```
## Phase 5B of demo meta-system

Generalizes scattered dashboard endpoints into `/api/orchestrate/*`. Demo apps call this surface for commodity-provider operations (alfredPay-direct REST, BlindPay, Iron, Coinbase, LI.FI). Dynamic and Fireblocks remain app-direct (D-003).

### What changed
- 6 endpoints under `/api/orchestrate/*`.
- Shared auth middleware with `x-dynamic-environment-id` header support.
- Provider resolver reads demo config to determine which package + env to call.
- Zod request schemas, state-machine integration, sandbox-by-default.
- Existing scattered endpoints preserved for back-compat.

### Spark26
Untouched.

### References
- `DECISIONS.md` (D-001, D-003, D-004, D-005, D-010)
- Phase prompt: `docs/projects/demo-meta-system/phases/05b-orchestration.md`
```

After merge, update `PROGRESS.md` row "5B. Orchestration API" to `🟢 done`.
