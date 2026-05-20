# Checkouts — Migrate Swap Engine to Dynamic Checkout Flow

**Date:** 2026-05-19
**Scope:** `apps/checkouts/` only
**Branch:** `worktree-checkouts-checkout-flow`
**Status:** Draft — pending user review

## 1 — Problem

The checkout swap path in `apps/checkouts` does not broadcast transactions. Observed symptom: after the user clicks confirm, the wallet never prompts. LI.FI's `executeRoute` bails before reaching the signing step. The proximate cause is that `lib/dynamicClient.ts` calls `addEvmExtension(client)` / `addSolanaExtension(client)` / `addWalletConnectEvmExtension(client)` — the `@dynamic-labs-sdk/client` v0.6+ extension functions take no arguments. The EVM extension's wallet-client plumbing therefore never registers, so the `walletClient` returned by `createWalletClientForWalletAccount` cannot complete the send path LI.FI expects.

Rather than fix the LI.FI path, we are migrating the swap engine in this app to Dynamic Checkout Flow (`@dynamic-labs-sdk/client` Checkout Flow API). Checkout Flow handles preparation, signing, and broadcasting internally, so the failure mode disappears with the rewrite and the demo modernizes onto the new primitive.

## 2 — Goal

Replace the LI.FI-based wallet-funded swap path in `apps/checkouts` with Dynamic Checkout Flow. **The user-visible UI and UX must remain identical** — same screens, same flow, same step transitions, same copy, same error messaging. Implementation is swapped underneath an unchanged surface.

## 3 — Non-goals

- Retiring `@dynamic-demos/lifi` package or dashboard's `/api/orchestrate/swap` endpoints (other apps may consume them; deferred to a follow-up audit).
- Touching `apps/spark26` (D-001 invariant: zero-touch).
- Changing the Kraken / exchange-transfer branch in `use-payment-execution.ts` — that path is independent of swap routing and stays as-is.
- Redesigning the dashboard's per-app checkout config (`getCheckoutConfig`, brand/theme/settlement storage). It stays the source of truth for app config. A single additive optional field (`dynamicCheckoutId`) may be required pending the §5.4 investigation — that schema change, if needed, lands as a small prerequisite dashboard PR before this one, keeping this PR `apps/checkouts/`-only.
- Adding new chains, tokens, or features beyond what the existing demo configurations declare.
- Migrating the dashboard's transient transaction state off Redis. The Redis-backed dashboard transaction mirror stays in place; this migration replaces the *routing* layer only, not the *persistence* layer.

## 4 — Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Approach | A: client-side Checkout Flow, dashboard keeps config | Checkout Flow is a browser SDK primitive; wrapping it server-side defeats the purpose. Dashboard remains config/theme store. |
| Tx persistence | Keep dashboard transaction mirror (Redis-backed) | The dashboard's transient transaction store (Redis per CLAUDE.md) stays the canonical record for analytics and cross-app observability. Checkout Flow becomes the routing engine; the dashboard mirror is dual-written from the Checkout Flow lifecycle. `lib/api/transactions.ts` and `hooks/use-transaction.ts` remain. |
| Blast radius | `apps/checkouts/` only | Smallest revertable PR. `@dynamic-demos/lifi` package and dashboard LI.FI endpoints survive for now. |
| Workspace | Isolated worktree | Already created: `.claude/worktrees/checkouts-checkout-flow` on `worktree-checkouts-checkout-flow`. |
| UI/UX | Identical to current behavior | The Checkout Flow primitives wire into the existing screens, copy, and step animations. No screen redesign. |

## 5 — Architecture

### 5.1 — Module layout (after migration)

**New:**
- `apps/checkouts/lib/checkout-flow/` — SSR-safe wrappers around Dynamic SDK Checkout Flow functions, mirroring the `lib/dynamicClient.ts` pattern (functions that gate on `getClient()` and return safe defaults on the server).
  - `index.ts` — `createTransaction`, `attachSource`, `getQuote`, `submitTransaction`, `getTransaction`, `cancelTransaction` wrappers + re-exported types.
  - `status-map.ts` — pure functions translating Dynamic transaction status → existing `TransactionStep[]` UI updates. Single source of truth for status semantics.
- `apps/checkouts/hooks/use-checkout-flow.ts` — React hook that owns the create → attach → quote → submit → poll → cancel lifecycle. Same callback shape (`onUpdate`, `onRejected`, `onError`) as the current `useLiFi.executeSwap` so the call site refactor in `use-payment-execution.ts` is mechanical.

**Refactored:**
- `apps/checkouts/components/payment-widget/use-payment-execution.ts` — wallet-funded branch rewritten to call `useCheckoutFlow` for routing, and to dual-write Checkout Flow lifecycle events into the existing `useTransaction.initialize/update/submit` dashboard mirror calls. Exchange (Kraken) branch is verbatim.
- `apps/checkouts/components/payment-widget/use-payment-actions.ts` — quote orchestration moves into `useCheckoutFlow`; this hook orchestrates token selection only.
- `apps/checkouts/hooks/use-transaction.ts` — stays. The lifecycle hook now relays Checkout Flow state to the dashboard mirror endpoint instead of LI.FI quote/route data. `UpdateTransactionParams` may need a new field (e.g. `dynamicTransactionId`) to record the upstream Checkout Flow tx id; that's a small additive change.
- `apps/checkouts/lib/api/transactions.ts` — stays. Same shape (`initializeTransaction`, `updateTransaction`, `submitTransaction`, `cancelTransaction`, `failTransaction`). Payload semantics change from "LI.FI route data" to "Checkout Flow state snapshot"; the on-the-wire field set is whatever the dashboard endpoint accepts, evolved additively.
- `apps/checkouts/lib/dynamicClient.ts:147-149` — change `addEvmExtension(client)` → `addEvmExtension()`, same for Solana and WC variants. Bug fix that becomes correct under the new SDK API the Checkout Flow requires.
- `apps/checkouts/lib/widget-config.ts` — drop LI.FI chain id translation helpers (`toLiFiChainId`, `LIFI_SOLANA_CHAIN_ID`) once consumers are gone.
- `apps/checkouts/AGENTS.md` — narrative + invariants updated to reflect Checkout Flow primary path while noting the dashboard tx mirror is retained.

**Removed:**
- `apps/checkouts/hooks/use-lifi/` (entire directory — `index.ts`, `evm.ts`, `solana.ts`, `utils.ts`).
- `apps/checkouts/lib/actions/lifi.ts` (the entire `lib/actions/` directory if no other files exist there).
- `apps/checkouts/components/payment-widget/utils.ts` references to LI.FI-specific helpers (`isImmutableQuoteStatus`, etc.) — audited and removed.
- Dependencies in `apps/checkouts/package.json`: `@lifi/sdk`, `@dynamic-demos/lifi`.

### 5.2 — Data flow (wallet-funded path)

Two parallel state tracks are maintained throughout the flow: the **Checkout Flow track** (Dynamic SDK, drives signing + UI updates) and the **dashboard mirror track** (existing `useTransaction` hook backed by Redis on the dashboard side, drives analytics + cross-app observability).

```
Page load
  ↓
useTransaction.initialize({ externalId, metadata })           // dashboard mirror — unchanged
  ← dashboardTxId
  ↓
User picks token + amount on asset-selector screen
  ↓
use-payment-actions: handleTokenSelect()
  → useCheckoutFlow.beginCheckout({ amount, currency, externalId, metadata })
    → createCheckoutTransaction({ amount, currency, checkoutId: <dynamic checkout id> })
    → attachCheckoutTransactionSource({
        transactionId, fromAddress: primaryWallet.address,
        fromChainId: token.chainId, fromChainName: token.chainName,
      })
    → getCheckoutTransactionQuote({ transactionId, fromTokenAddress: token.address })
  ← quote: { rate, toAmount, fees, gas, eta }
  → useTransaction.update({ dynamicTransactionId, walletAddress, quote })   // mirror dual-write
  ↓
Review screen renders quote
  ↓
User clicks Confirm → goToProcessing(amount, token, initialSteps)
  ↓
useCheckoutFlow.submit({ onUpdate, onRejected, onError })
  → submitCheckoutTransaction({ transactionId, walletAccount: primaryWallet })
    ↳ Dynamic SDK: prepares, signs (wallet prompt), broadcasts
  → startPolling(getCheckoutTransaction, intervalMs)
    ↳ each poll: status-map.ts converts status → ExecutionUpdate → onUpdate
    ↳ first txHash → useTransaction.submit(txHash)                          // mirror dual-write
    ↳ terminal status (completed | failed | cancelled) ends polling
       ↳ failure → useTransaction.fail(reason)                              // mirror dual-write
       ↳ cancel  → useTransaction.cancel()                                  // mirror dual-write
  ↓
processing screen reflects each ExecutionUpdate through generateTransactionSteps
  ↓
On terminal status: navigate to completion or pending screen (existing behavior)
```

Dual-write rule: every Checkout Flow lifecycle transition that today corresponds to a dashboard mirror call keeps that mirror call. The dashboard payload's *content* changes (from LI.FI route data to Checkout Flow state), but the *cadence* and *which mirror function is called when* is preserved. If a dashboard endpoint update is needed to accept the new payload shape (e.g., accepting `dynamicTransactionId`), that's an additive change behind the existing call sites.

Cancellation path: when user cancels at any non-terminal step, `useCheckoutFlow.cancel()` calls `cancelCheckoutTransaction({ transactionId })` and emits a `FAILED` `ExecutionUpdate`; `useTransaction.cancel()` mirrors the cancellation to the dashboard.

### 5.3 — Status mapping

The existing UI uses `TransactionStep[]` from `transaction-progress-screen.tsx`, populated by `generateTransactionSteps(mode, needsConversion, sourceSymbol, destSymbol)` and updated by `ExecutionUpdate { stepIndex, totalSteps, status, txHash, processType, isCrossChain?, isBridging?, lifiExplorerLink? }`. **The migration keeps this `ExecutionUpdate` contract verbatim** — `status-map.ts` synthesizes `ExecutionUpdate` values from Dynamic transaction status so downstream UI code is unchanged.

Mapping (exact field values to be confirmed against the Dynamic SDK at implementation time; this table is the design target):

In the table below, `processType` reads `SWAP` when `needsConversion` is true (cross-token or cross-chain quote) and `TRANSFER` when it is false (same-token same-chain). The hook resolves this once at `beginCheckout` time and reuses the value for every subsequent update.

| Dynamic status (target) | `ExecutionUpdate.status` | `processType` | Step targeted |
|---|---|---|---|
| `pending` / `quoting` | `PENDING` | `SWAP` or `TRANSFER` (per `needsConversion`) | step 0 active |
| `awaiting_signature` | `ACTION_REQUIRED` | `SWAP` or `TRANSFER` (per `needsConversion`) | step 0 active |
| `signed` / `submitted` (first txHash) | `RUNNING` | `SWAP` or `TRANSFER` (per `needsConversion`) | step 1 active, `txHash` set |
| `bridging` (cross-chain only) | `RUNNING` | `CROSS_CHAIN` | step 2 active, `isCrossChain=true`, `isBridging=true` |
| `settling` / `confirming` | `RUNNING` | `RECEIVING` | last step active |
| `completed` | `DONE` | `RECEIVING` | last step DONE |
| `failed` | `FAILED` | (current) | current step FAILED |
| `cancelled` | `FAILED` (cancellation flag set in hook) | (current) | current step FAILED |

`lifiExplorerLink` becomes optional; if Dynamic exposes an equivalent explorer URL, surface it under the same field for UI parity. If not, the field is simply absent and the existing UI degrades gracefully (it's already optional in the type).

### 5.4 — `checkoutId` resolution (step-0 investigation)

The Checkout Flow's `createCheckoutTransaction({ checkoutId })` parameter likely refers to a Dynamic-registered merchant/checkout entity, not the dashboard's per-demo config id. Resolution plan:

1. **First spike (read-only):** confirm what `checkoutId` actually is by reading the SDK source and/or Dynamic dashboard docs.
2. **If it's a Dynamic-registered entity:**
   - Add a `dynamicCheckoutId: string` field to the dashboard's checkout config schema (additive, nullable for back-compat).
   - Add an authoring affordance in the dashboard to register a Dynamic checkout (or accept a manually-provided id).
   - The migration falls back to a single workspace-default `dynamicCheckoutId` for any config that doesn't have one set, so existing configs keep working without dashboard changes during the cut.
3. **If it's an arbitrary string:** use the dashboard config id directly.

This investigation gates implementation step 2 (writing the new hook). If it reveals a blocker, we pause and reconvene before continuing.

### 5.5 — Direct transfer (source token == destination token)

Current code short-circuits LI.FI when `needsTokenConversion(token, settlement)` is false and calls `walletClient.writeContract` directly. We need to verify whether Checkout Flow handles this case transparently:

- **If yes:** drop the `executeDirectTransfer` branch entirely; Checkout Flow handles all source-token shapes uniformly.
- **If no:** keep an `executeDirectTransfer` helper inside `lib/checkout-flow/` for the source==destination case. The Kraken/exchange branch already exercises this code path indirectly, so the helper isn't pure overhead.

Implementation step 2 confirms the answer against the Dynamic SDK before committing the cut.

### 5.6 — Chain coverage check

Current demo configs target EVM (Ethereum, Base, Optimism, Arbitrum, Polygon) and Solana. Checkout Flow advertises BTC/EVM/SOL/SUI. We will:

1. Enumerate every chain referenced in current dashboard checkout configs.
2. Verify each is supported by Checkout Flow.
3. If any chain is unsupported, file a follow-up to either (a) restrict that demo's chain set or (b) hold this migration until coverage lands.

This is a step-0 investigation alongside `checkoutId` resolution.

## 6 — UI/UX preservation invariants

These are the contract that "no impact on existing UI/UX" decomposes into:

1. **Screen graph unchanged.** All eight payment-modal screens (`asset-selector`, `connected-wallets`, `deposit-amount`, `kraken-whitelisting`, `review-payment`, `transaction-progress`, plus `error-banner` and `info-box`) render the same content for the same state inputs.
2. **Step list unchanged.** `generateTransactionSteps(mode, needsConversion, sourceSymbol, destSymbol)` continues to be the single source of step labels. No new steps added, no existing steps removed.
3. **Step transitions unchanged.** The `ExecutionUpdate` payload contract that `transaction-progress-screen.tsx` consumes is unchanged in shape, field names, and value enums. Only the producer changes from LI.FI's `updateRouteHook` to `status-map.ts` driven by Checkout Flow polling.
4. **Copy unchanged.** All user-facing strings remain identical.
5. **Cancellation UX unchanged.** User rejection still surfaces as a cancellation (not an error) per the existing branching in `use-payment-execution.ts`.
6. **Quote display unchanged.** Review screen shows the same fields (rate, fees, gas, ETA). If Checkout Flow's quote shape lacks any current field, we fill it with a sensible placeholder (e.g., `—`) rather than redesigning the row.
7. **Theme/brand pipeline unchanged.** `--brand-*` CSS variable wiring is untouched; nothing in `lib/checkouts-brand.ts` or `globals.css` changes.

Acceptance check (manual): before and after, click through each demo config in a browser and confirm the screen sequence, copy, animations, and timings feel the same. If anything regresses, the migration is incomplete.

## 7 — Testing

### 7.1 — Automated (vitest)

- **`lib/checkout-flow/status-map.test.ts`** — table-driven: every Dynamic status → expected `ExecutionUpdate`. Pure function tests, no SDK mocking needed.
- **`lib/checkout-flow/index.test.ts`** — wrapper functions return safe defaults when client is uninitialized; pass-through behavior when client is ready. Mock `@dynamic-labs-sdk/client`.
- **`hooks/use-checkout-flow.test.ts`** — happy path (create → attach → quote → submit → DONE), cancel path, failure path, polling timeout. Mock the wrapper module.
- **Update existing tests** — `__tests__/dynamic-client-singleton.test.ts` is unaffected (singleton mechanics are unchanged). Any tests referencing `useLiFi` or `lib/actions/lifi` are deleted with the source.

### 7.2 — Manual

- Run `pnpm --filter @dynamic-demos/checkouts dev` (port 4001) and walk through each existing demo checkout config end-to-end with a Dynamic-issued WaaS wallet on testnet (or whichever environment the existing demo configs target). Specifically verify:
  - Same-chain swap (e.g., Base USDC → Base USDC.e if a config exists).
  - Cross-chain swap (e.g., Polygon USDC → Base USDC).
  - Direct transfer (source == destination).
  - User-rejection in wallet — cancellation surfaces, not error.
  - Network failure mid-poll — error surfaces gracefully.

### 7.3 — CI

The repo's CI gates (`pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test`) run on the PR. No CI changes needed.

## 8 — Migration sequencing (commits within a single PR)

1. `fix(checkouts): pass no args to add{Evm,Solana,WalletConnectEvm}Extension` — standalone bug fix valuable even if migration is reverted.
2. `feat(checkouts): add lib/checkout-flow module + status-map` — new code with unit tests, no consumers yet.
3. `feat(checkouts): add useCheckoutFlow hook + tests` — new code with unit tests, no consumers yet.
4. `refactor(checkouts): wire useCheckoutFlow into payment-widget` — flip `use-payment-execution.ts` wallet-funded branch. Keep `useLiFi` import temporarily to avoid a broken intermediate.
5. `chore(checkouts): drop @lifi/sdk + @dynamic-demos/lifi` — remove dead routing code only: `hooks/use-lifi/`, `lib/actions/lifi.ts`, and matching deps from `package.json`. The dashboard tx mirror (`hooks/use-transaction.ts`, `lib/api/transactions.ts`) stays.
6. `docs(checkouts): update AGENTS.md for Checkout Flow primary path` — narrative + invariants + integration map. AGENTS.md `Data boundaries` section is updated to note that Checkout Flow tx state is dual-written into the dashboard's Redis-backed mirror.

Each commit leaves the app buildable and the test suite green.

## 9 — Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Checkout Flow can't route a chain/token pair currently supported by LI.FI | Medium | Step-0 chain coverage check (§5.6) before code changes. |
| Polling cadence produces visibly choppier step transitions vs LI.FI's per-process callbacks | Medium | Tune poll interval; accept slightly different feel as long as step order and copy are unchanged. |
| `checkoutId` requires per-config Dynamic registration we don't have | Medium | Step-0 investigation (§5.4) with a fallback workspace-default id. |
| Quote shape lacks fields the review screen renders (e.g. integrator fee breakdown) | Low | Fill with `—` placeholder; do not redesign the row. |
| Checkout Flow status enum doesn't cleanly map to existing `ExecutionUpdate` semantics | Low | `status-map.ts` is the single point that needs adjustment; UI consumers see no contract change. |
| Hidden coupling to LI.FI in `widget-config.ts` or `format.ts` not surfaced during code reading | Low | Grep audit after step 5; CI typecheck catches dangling references. |

## 10 — Open questions (resolved during implementation)

1. **`checkoutId` semantics** — see §5.4.
2. **Direct transfer behavior** — see §5.5.
3. **Chain coverage** — see §5.6.
4. **Quote field parity** — what does `getCheckoutTransactionQuote` return, and do all current review-screen fields have an equivalent?
5. **Poll interval** — what cadence does Dynamic recommend? Start with 1 s, adjust based on observed step-transition smoothness.
6. **Solana wallet signing** — does Checkout Flow's `submitCheckoutTransaction` accept Solana wallet accounts directly, or does it require the adapter shim currently in `hooks/use-lifi/solana.ts`? If the latter, the shim is preserved and moved into `lib/checkout-flow/`.

## 11 — Out of scope (followups, not blockers)

- Audit `@dynamic-demos/lifi` package usage across the monorepo; retire if checkouts was its only consumer.
- Audit dashboard's `/api/orchestrate/swap` consumers; retire its LI.FI path if no app calls it after this migration.
- Apply the same `addEvmExtension()` argument fix to other apps if they have the same anti-pattern (separate PR).
- Future reconsideration of whether to retire the dashboard tx mirror once Checkout Flow has been observed in production for a while — explicitly out of scope for this PR. If undertaken, that decision requires its own design pass.

## 12 — Acceptance criteria

A merged PR satisfies all of:

- [ ] `pnpm --filter @dynamic-demos/checkouts typecheck` passes.
- [ ] `pnpm --filter @dynamic-demos/checkouts lint` passes.
- [ ] `pnpm --filter @dynamic-demos/checkouts test` passes; new tests cover status-map, wrappers, and hook lifecycle.
- [ ] `pnpm --filter @dynamic-demos/checkouts build` passes (Vercel preview equivalent).
- [ ] Manual smoke through every current demo config (§7.2) shows identical screen sequence and copy to the pre-migration build.
- [ ] Wallet prompts the user to sign during swap submission (the original "wallet never prompts" symptom is gone).
- [ ] No reference to `@lifi/sdk` or `@dynamic-demos/lifi` remains anywhere under `apps/checkouts/`.
- [ ] `apps/checkouts/AGENTS.md` reflects the Checkout Flow architecture.
- [ ] Dashboard transaction mirror (`hooks/use-transaction.ts`, `lib/api/transactions.ts`) is retained and still dual-written from every Checkout Flow lifecycle transition that previously triggered a mirror call (initialize → update → submit → done | fail | cancel). Verified by inspecting the dashboard's transaction record after a manual smoke run.
