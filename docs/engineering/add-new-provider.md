# Adding a new provider package

This is the runbook for wrapping a new third-party provider (onramp, offramp, KYC, payments, signing, etc.) as a `packages/<provider>/` workspace. Time budget: 2–4 hours for the full package + dashboard wiring, depending on API complexity.

> Decisions referenced: D-001 (dashboard orchestrator), D-003 (apps don't hold non-Dynamic/Fireblocks secrets), D-005 (sandbox by default), D-009 (boundary by API mechanism not brand), D-010 (state machine), D-011 (webhooks at dashboard only), D-014 (AGENTS.md required).

---

## Prerequisites

1. The provider has documented sandbox + production environments with stable base URLs.
2. You have sandbox credentials.
3. You have read `docs/projects/demo-meta-system/DECISIONS.md` D-009 — does this provider belong as its own package, or as a sub-module of `packages/fireblocks` (Fireblocks Network listing)?
   - **Own package:** Provider has its own REST API and its own webhook surface. (Iron, BlindPay, Coinbase Onramp, etc.)
   - **Fireblocks sub-module:** Provider is exposed through Fireblocks Network — no direct API. Add a config under `packages/fireblocks/src/providers/<name>` instead and skip the rest of this runbook.

## Steps

### 1. Scaffold the package

Mirror the existing package shape. The smallest reference is `packages/coinbase-onramp/`; the most complete is `packages/fireblocks/`. Minimum file set:

```
packages/<provider>/
├── package.json              # name: @dynamic-demos/<provider>; private: true
├── tsconfig.json             # extends ../tsconfig/base.json
├── AGENTS.md                 # required (D-014); use docs/templates/AGENTS.template.md
├── README.md                 # 1-pager: install, usage, env contract
└── src/
    ├── index.ts              # public surface; explicit re-exports only
    ├── env.ts                # resolveBaseUrl(env: 'sandbox' | 'production'); NO process.env reads
    ├── client.ts             # factory function — required args validated at call time
    ├── mock-client.ts        # sandbox-only mock implementing the same interface
    ├── types.ts              # all request/response types; namespace-grouped
    ├── webhooks.ts           # verifySignature + normalize → CanonicalEvent
    ├── state-mapping.ts      # provider status → packages/transactions/state.ts
    └── __tests__/
        ├── smoke.test.ts     # public surface compiles + factory defaults to sandbox
        ├── client.test.ts    # per-namespace request shape coverage
        ├── webhooks.test.ts  # signature verify + normalize
        └── state-mapping.test.ts
```

Add to root `pnpm-workspace.yaml` if not already covered by the `packages/*` glob.

### 2. Author the client factory

The package never reads `process.env`. `createClient` validates required args and resolves the base URL via `resolveBaseUrl(env)`:

```ts
export interface ClientConfig {
  apiKey: string;
  env?: 'sandbox' | 'production'; // sandbox-by-default per D-005
  fetchImpl?: typeof fetch;
}

export function create<Provider>Client(cfg: ClientConfig) {
  if (!cfg.apiKey) throw new Error('apiKey is required');
  // ...
}
```

Sandbox-by-default is non-negotiable. Production opt-in is the caller's responsibility — typically the dashboard-side `lib/<provider>/client.ts` helper reads a `<PROVIDER>_ENVIRONMENT` env var and passes it through.

### 3. Author the AGENTS.md

Copy `docs/templates/AGENTS.template.md`. Required frontmatter:

- `name`, `kind: package`, `flow_role`, `custody`, `status`.
- `regions:` if `flow_role` is `onramp` or `offramp`. (LLMs use this to match demo briefs to providers.)
- `provider:` block with `name`, `docs`, `api_reference`, `agent_docs`.

Run `pnpm registry` afterwards so `.claude/demo-registry.{md,json}` picks up the new package.

### 4. Author state-mapping.ts

Map every provider status string to a canonical `TransactionState` (from `packages/transactions/src/state.ts`). Unknown / new upstream statuses return `null` — the webhook handler treats `null` as "ignore this event," which prevents new statuses from blocking the pipeline.

Test every documented status. Cover happy path + terminal states (`confirmed`, `failed`, `cancelled`).

### 5. Author webhooks.ts

Two required exports:

```ts
export function verifySignature({ body, headers, secret }): boolean;
export function normalize({ body, headers }): CanonicalEvent;
```

`CanonicalEvent` shape lives in `packages/iron/src/webhooks.ts` (reference). Provider-quirky header parsing belongs in the dashboard-side adapter (see `docs/engineering/add-new-webhook-receiver.md`), not in the package — the package owns "given a signed payload, is it authentic, and what does it mean in canonical terms?"

### 6. Wire the dashboard-side env-reader

Create `apps/dashboard/src/lib/<provider>/client.ts`:

```ts
import { env } from '@/env';
import { create<Provider>Client } from '@dynamic-demos/<provider>';

let cached;
export function get<Provider>Client() {
  if (cached) return cached;
  if (!env.<PROVIDER>_API_KEY) throw new Error('...');
  cached = create<Provider>Client({
    apiKey: env.<PROVIDER>_API_KEY,
    env: env.<PROVIDER>_ENVIRONMENT,
  });
  return cached;
}
```

This is the **only sanctioned env-reader** for the provider's credentials. Add the Zod fields to `apps/dashboard/src/env.ts` and the `runtimeEnv` block. Default `<PROVIDER>_ENVIRONMENT` to `sandbox`.

### 7. Wire webhook receiver

Follow `docs/engineering/add-new-webhook-receiver.md` — it covers adapter, route, secrets, replay.

### 8. Add to demo-registry

```bash
pnpm registry
```

The generator scans every `AGENTS.md` and produces `.claude/demo-registry.{md,json}`. Commit both files alongside the new package in the same PR.

### 9. Run the gates

```bash
pnpm --filter @dynamic-demos/<provider> exec tsc --noEmit
pnpm --filter @dynamic-demos/<provider> test
pnpm --filter @dynamic-demos/dashboard exec tsc --noEmit
pnpm --filter @dynamic-demos/dashboard test
```

CI runs `pnpm turbo typecheck && lint && test` on every PR — verify locally before pushing.

## Common gotchas

- **Don't read `process.env` in the package.** Every env-reader belongs in `apps/dashboard/src/lib/<provider>/client.ts` (or the consumer app's `lib/` for app-side helpers like `apps/proceeds/lib/iron-env.ts`).
- **Don't hardcode the production base URL as default.** `env: 'sandbox'` is the default per D-005. CI will catch production env strings in `apps/*/.env.example` files via the `[prod-creds]` guardrail, but the package's own defaults are caught only by review.
- **Don't lump unrelated providers into one package.** Boundary is by API mechanism (D-009). Stripe + Fireblocks + Iron each get their own package even when they overlap in product surface.
- **Don't skip the mock client.** `MockClient` is what the `create-demo-app` skill uses to scaffold demos without burning real API quota. Mirror the real client's namespace shape.

## See also

- `docs/templates/AGENTS.template.md` — frontmatter spec.
- `packages/iron/` — most complete reference for a non-Fireblocks provider.
- `packages/coinbase-onramp/` — minimal reference.
- `docs/engineering/add-new-webhook-receiver.md` — dashboard-side webhook wiring.
- `docs/projects/demo-meta-system/DECISIONS.md` — D-003, D-005, D-009, D-010, D-011, D-014.
