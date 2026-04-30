# Phase 1A — Fireblocks Orders client + provider sub-modules

> **Self-contained agent prompt.** Read this entire file. Then read `PLAN.md`, `DECISIONS.md`, and `GLOSSARY.md`.

---

## Your role

Promote the duplicated Fireblocks Orders client + provider configs into `packages/fireblocks`. Today the same `/v1/trading/orders` client is implemented twice: in `apps/proceeds/lib/fireblocks.ts` and `apps/cross-border-ap-ar/lib/fireblocks-orders.ts`. This phase consolidates them and adds the canonical Fireblocks-mediated provider configs (MTLco, alfredPay-via-Fireblocks).

This phase ships as **one logical PR**.

## Wave + dependencies

- Wave 2.
- Depends on Phase 0.5 merged (CI gates active).
- Parallelizable with: Phase 1B (independent providers), Phase 1E (transactions package), Phase 2-scaffold.
- Sequence with Phase 1D (Dynamic consolidation) — 1D runs after.

## Skills to use

1. `superpowers:using-git-worktrees` — worktree at `.worktrees/phase-1a-fireblocks`, branch `phase/01a-fireblocks-orders`.
2. `superpowers:writing-plans` — multi-step migration; write a plan.
3. `superpowers:test-driven-development` — write smoke + signature tests before extraction; passing tests is the contract.
4. `superpowers:verification-before-completion`.
5. `superpowers:requesting-code-review`.

## Hard rules

- `apps/spark26/` zero-touch.
- Follow existing `packages/fireblocks` conventions (read its current `index.ts`, `package.json`, `tsconfig.json` first).
- No skipping pre-commit hooks.
- Sandbox-by-default: every helper takes an explicit `env: 'sandbox' | 'production'` argument. Default at the call site, not in the helper.
- Use `git mv` where moving files; use careful diff for inline migrations.

## Required reading before code changes

- `packages/fireblocks/src/index.ts` — current exports.
- `packages/fireblocks/src/client.ts` — existing client pattern.
- `apps/proceeds/lib/fireblocks.ts` — first duplicate.
- `apps/cross-border-ap-ar/lib/fireblocks-orders.ts` — second duplicate.
- `apps/cross-border-ap-ar/lib/env.ts` — current MTLco + alfredPay provider config shape.
- `apps/proceeds/hooks/use-pending-payouts.ts` — consumer of orders list.
- `DECISIONS.md` D-005 (sandbox-by-default), D-009 (provider package boundary), D-010 (state machine).

## What needs to happen

### 1. Create `packages/fireblocks/src/orders.ts`

Extract the Fireblocks `/v1/trading/orders` client. Public exports:

- `FireblocksOrder` (interface) — order record shape returned by the API. Mirror what's in proceeds + ap-ar (consolidate field names; keep canonical).
- `OrderSide` — `'BUY' | 'SELL'`.
- `OrderSettlementType` — `'PREFUNDED' | 'DVP'` (others if real Fireblocks API has them).
- `listOrders(client, opts: { pageSize?: number })` — `GET /v1/trading/orders`.
- `createOrder(client, params: CreateOrderParams)` — `POST /v1/trading/orders`. Params include side, base/quote asset, provider config (provider id + account id), settlement type, etc.

Take the existing Fireblocks client (`packages/fireblocks/src/client.ts`) as the first arg so callers configure auth once and pass it through.

Write tests at `packages/fireblocks/src/orders.test.ts` using Vitest + MSW (or fetch mocking equivalent — match the rest of the package's test setup if it exists; otherwise add Vitest config). At minimum:
- `listOrders` returns parsed `FireblocksOrder[]` for a fixture response.
- `createOrder` posts the right body shape.
- Both surface upstream errors as typed exceptions.

### 2. Create `packages/fireblocks/src/providers/mtlco.ts`

Thin config wrapper for the MTLco Fireblocks Network listing. Exports:

- `MtlcoConfig` (type) — `{ providerId: string; accountId: string }`.
- `createMtlcoOnrampOrder(client, opts)` — calls `createOrder` with `side: 'SELL'` (USD→USDC), MTLco provider IDs, `PREFUNDED` settlement, etc. Match the shape currently in `cross-border-ap-ar/lib/fireblocks-orders.ts:createOnrampOrder()`.

Document in inline comments: which env vars supply the IDs (`FIREBLOCKS_MTLCO_PROVIDER_ID`, `FIREBLOCKS_MTLCO_ACCOUNT_ID`), what testnet vs mainnet IDs look like, and that this wraps Fireblocks Orders rather than calling MTLco directly (no separate API).

### 3. Create `packages/fireblocks/src/providers/alfredpay.ts`

Same shape as MTLco. Wraps Fireblocks DVP path for alfredPay (alfredPay's Fireblocks Network listing).

- `AlfredpayFireblocksConfig` (type) — `{ providerId: string; accountId: string }`.
- `createAlfredpayOfframpOrder(client, opts)` — `side: 'SELL'` (USDC→fiat), `DVP` settlement, alfredPay provider IDs.

Document explicitly: this is the **Fireblocks-mediated path**. The **direct alfredPay REST integration** lives in `packages/alfredpay` (Phase 1B). A demo picks one based on whether it needs Fireblocks vault custody or wants to call alfredPay directly via Dynamic wallets.

### 4. Update `packages/fireblocks/src/index.ts` to re-export

```ts
export * from './client';   // existing
export * from './vault';    // existing
// new:
export * from './orders';
export * as Mtlco from './providers/mtlco';
export * as Alfredpay from './providers/alfredpay';
```

(Match the existing namespace style in this package; if it exports flat instead of namespaced, mirror that.)

### 5. Migrate `apps/proceeds/lib/fireblocks.ts` to consume the package

Replace the duplicated `listOrders` + `createOrder` code with imports from `@dynamic-demos/fireblocks`. The `FireblocksOrder` type now comes from the package; remove the local copy.

Keep proceeds-specific logic (e.g., the mock-mode detection in the existing file) local — it doesn't belong in the package.

Verify `apps/proceeds/lib/fireblocks-pending.ts` and `apps/proceeds/hooks/use-pending-payouts.ts` still typecheck.

### 6. Migrate `apps/cross-border-ap-ar/lib/fireblocks-orders.ts` to consume the package

Replace `createOnrampOrder` with a call to `createMtlcoOnrampOrder`. Replace `createOfframpOrder` (the alfredPay path) with `createAlfredpayOfframpOrder`. The stub fallback (when `FIREBLOCKS_ALFRED_ACCOUNT_ID` is unset) stays in the app — not the package's concern.

### 7. Add `state-mapping.ts` placeholders

In `packages/fireblocks/src/providers/mtlco.ts` and `alfredpay.ts`, add a `mapStatus(upstream: string): TransactionState` function. **This depends on `packages/transactions` (Phase 1E).** If 1E hasn't merged yet, leave a typed `TODO` and a stub returning `TransactionState.pending` for unknown statuses.

If 1E has merged: use the real `TransactionState` enum and write a complete mapping covering Fireblocks order statuses (`SUBMITTED`, `PENDING`, `EXECUTED`, `FAILED`, etc.).

### 8. Verify

```
pnpm install
pnpm turbo typecheck
pnpm turbo lint
pnpm turbo build
pnpm turbo test
```

All must pass. The two consuming apps (`proceeds`, `cross-border-ap-ar`) must continue to build and behave identically.

## Acceptance criteria

- [ ] `packages/fireblocks/src/orders.ts` exports `FireblocksOrder`, `listOrders`, `createOrder` with passing tests.
- [ ] `packages/fireblocks/src/providers/mtlco.ts` and `alfredpay.ts` exist with thin wrappers + state-mapping (or TODO if 1E pending).
- [ ] `apps/proceeds/lib/fireblocks.ts` no longer duplicates orders client; imports from package.
- [ ] `apps/cross-border-ap-ar/lib/fireblocks-orders.ts` consumes the new wrappers; stub fallback preserved locally.
- [ ] `packages/fireblocks/AGENTS.md` updated (or stubbed if Phase 3 hasn't run yet — leave a placeholder section noting "regenerated in Phase 3").
- [ ] All CI gates pass.
- [ ] `apps/spark26/` untouched.

## Commit plan

1. `feat(fireblocks): add shared Orders API client + types`
2. `feat(fireblocks): add MTLco provider config wrapper`
3. `feat(fireblocks): add alfredPay (Fireblocks-DVP) provider config wrapper`
4. `refactor(proceeds): consume @dynamic-demos/fireblocks Orders client`
5. `refactor(cross-border-ap-ar): consume @dynamic-demos/fireblocks provider wrappers`

## PR title

`feat(fireblocks): Phase 1A — consolidate Orders client + add MTLco/alfredPay-via-Fireblocks providers`

## PR description template

```
## Phase 1A of demo meta-system

Promotes the Fireblocks Orders client into `@dynamic-demos/fireblocks` and removes duplication from `apps/proceeds/` and `apps/cross-border-ap-ar/`. Adds Fireblocks-Network-listing provider wrappers for MTLco and alfredPay.

### What changed
- `packages/fireblocks/src/orders.ts` — shared `/v1/trading/orders` client + `FireblocksOrder` type. Vitest tests for list/create paths and error handling.
- `packages/fireblocks/src/providers/mtlco.ts` — thin onramp wrapper. Wraps Orders, doesn't call MTLco directly (MTLco has no separate API).
- `packages/fireblocks/src/providers/alfredpay.ts` — Fireblocks-DVP path for alfredPay. Direct REST integration is separate (Phase 1B `packages/alfredpay`).
- `apps/proceeds/lib/fireblocks.ts` — now imports from package; ~120 lines removed.
- `apps/cross-border-ap-ar/lib/fireblocks-orders.ts` — now imports provider wrappers; ~80 lines removed (stub fallback preserved locally).

### Spark26
Untouched.

### Tests
- `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo build && pnpm turbo test` all pass.
- New Vitest suite for orders client.

### References
- `DECISIONS.md` (D-009 provider boundary, D-005 sandbox default)
- Phase prompt: `docs/projects/demo-meta-system/phases/01a-fireblocks-orders.md`
```

After merge, update `PROGRESS.md` row "1A. Fireblocks Orders" to `🟢 done`.
