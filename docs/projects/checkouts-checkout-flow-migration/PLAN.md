# Checkouts — Dynamic Checkout Flow Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `@lifi/sdk`-based wallet-funded swap path in `apps/checkouts/` with Dynamic Checkout Flow (`@dynamic-labs-sdk/client` Checkout Flow API) while preserving the dashboard's Redis-backed transaction mirror and keeping the user-visible UI/UX identical.

**Architecture:** Client-side Checkout Flow becomes the routing + signing + broadcasting engine. The dashboard checkout config (brand/theme/settlement) and the Redis-backed dashboard transaction mirror remain in place. A new `useCheckoutFlow` hook wraps the SDK lifecycle (create → attach → quote → submit → events → cancel) and produces `ExecutionUpdate` payloads in the same shape the existing payment-widget already consumes — so the UI layer is untouched.

**Tech Stack:** Next.js 15 (`apps/checkouts`), `@dynamic-labs-sdk/client@0.25.0` (Checkout Flow), `@dynamic-labs-sdk/evm`, `@dynamic-labs-sdk/solana`, vitest, viem (preserved for type compat only).

**Source spec:** `docs/projects/checkouts-checkout-flow-migration/SPEC.md`

---

## SDK Findings (pre-implementation, baked into the tasks below)

Resolves spec §5.4, §5.5, §5.6, §10. Confirmed by reading `node_modules/@dynamic-labs-sdk/client/dist/modules/checkout/`.

| Open question | Resolution |
|---|---|
| `checkoutId` semantics | Optional. Pass `destinationAddresses` instead so no dashboard schema change required. |
| Direct transfer (source = destination) | `submitCheckoutTransaction` handles both; SDK exports `requiresConversion({ transaction })` to drive UI's SWAP vs TRANSFER processType. |
| Chain coverage | EVM + Solana fully supported (BTC/SUI also supported but not used by current configs). |
| Polling vs events | Events. `checkoutTransactionExecutionStateChanged` + `checkoutTransactionSettlementStateChanged` are auto-subscribed at `createCheckoutTransaction`. No polling. |
| Solana adapter shim | Not needed. `submitCheckoutTransaction` accepts `WalletAccount` directly for both EVM and Solana. |
| Quote field parity | `quote.fromAmount`, `quote.toAmount`, `quote.fees.totalFeeUsd`, `quote.fees.gasEstimate`, `quote.estimatedTimeSec`. All review-screen fields map. |
| `addEvmExtension(client)` argument | `client` is optional; passing or omitting both work in single-client apps. **Not a bug.** Drop the "free fix" commit from spec §8. |

**State enum mappings (concrete):**

| `CheckoutExecutionState` | `CheckoutSettlementState` | `ExecutionUpdate.status` | `processType` | Step targeted |
|---|---|---|---|---|
| `initiated` | `none` | `PENDING` | SWAP/TRANSFER per `requiresConversion` | 0 active |
| `source_attached` | `none` | `PENDING` | (same) | 0 active |
| `quoted` | `none` | `PENDING` | (same) | 0 active |
| `signing` | `none` | `ACTION_REQUIRED` | (same) | 0 active |
| `broadcasted` | `none` / `routing` | `RUNNING` (txHash set) | (same) | 1 active |
| `source_confirmed` | `bridging` | `RUNNING` | `CROSS_CHAIN` (isCrossChain=true, isBridging=true) | 2 active |
| `source_confirmed` | `swapping` | `RUNNING` | `SWAP` | last active |
| `source_confirmed` | `settling` | `RUNNING` | `RECEIVING` | last active |
| `source_confirmed` | `completed` | `DONE` | `RECEIVING` | last DONE |
| `failed` / `expired` | any | `FAILED` | (current) | current FAILED |
| `cancelled` | any | `FAILED` + cancel flag | (current) | current FAILED |
| any | `failed` | `FAILED` | (current) | current FAILED |

`submitCheckoutTransaction.onStepChange('approval' | 'transaction')` drives early UI transitions (step 0 ACTION_REQUIRED → step 1 RUNNING) before the first state event fires.

---

## File Structure

**Create:**
- `apps/checkouts/lib/checkout-flow/index.ts` — re-exports of SDK functions + SSR-safe wrappers
- `apps/checkouts/lib/checkout-flow/status-map.ts` — pure mapper: `(CheckoutTransaction, needsConversion) => ExecutionUpdate`
- `apps/checkouts/hooks/use-checkout-flow.ts` — React hook owning lifecycle
- `apps/checkouts/__tests__/checkout-flow/status-map.test.ts`
- `apps/checkouts/__tests__/checkout-flow/wrappers.test.ts`
- `apps/checkouts/__tests__/use-checkout-flow.test.ts`

**Modify:**
- `apps/checkouts/components/payment-widget/use-payment-execution.ts` — wallet branch calls `useCheckoutFlow`; exchange branch unchanged
- `apps/checkouts/components/payment-widget/use-payment-actions.ts` — drop LI.FI quote orchestration
- `apps/checkouts/components/payment-widget/utils.ts` — drop LI.FI-specific helpers
- `apps/checkouts/hooks/use-transaction.ts` — `UpdateTransactionParams` gains `dynamicTransactionId?: string`
- `apps/checkouts/lib/api/transactions.ts` — same shape, payload semantics shift to Checkout Flow state snapshot
- `apps/checkouts/lib/widget-config.ts` — drop `toLiFiChainId`, `LIFI_SOLANA_CHAIN_ID`
- `apps/checkouts/lib/types.ts` — drop LI.FI route types; rely on SDK types
- `apps/checkouts/package.json` — drop `@lifi/sdk`, `@dynamic-demos/lifi`
- `apps/checkouts/AGENTS.md` — narrative + invariants

**Delete:**
- `apps/checkouts/hooks/use-lifi/` (entire directory: `index.ts`, `evm.ts`, `solana.ts`, `utils.ts`)
- `apps/checkouts/lib/actions/lifi.ts` (and the `lib/actions/` directory if empty)

---

## Task 1: SSR-safe SDK wrappers

**Files:**
- Create: `apps/checkouts/lib/checkout-flow/index.ts`
- Test: `apps/checkouts/__tests__/checkout-flow/wrappers.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/checkouts/__tests__/checkout-flow/wrappers.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@dynamic-labs-sdk/client", () => ({
  createCheckoutTransaction: vi.fn(),
  attachCheckoutTransactionSource: vi.fn(),
  getCheckoutTransactionQuote: vi.fn(),
  submitCheckoutTransaction: vi.fn(),
  getCheckoutTransaction: vi.fn(),
  cancelCheckoutTransaction: vi.fn(),
  onEvent: vi.fn(() => () => {}),
}));

vi.mock("@/lib/dynamicClient", () => ({}));

import * as sdk from "@dynamic-labs-sdk/client";
import {
  createTransaction,
  attachWalletSource,
  getQuote,
  submit,
  getTransaction,
  cancel,
  onExecutionStateChanged,
  onSettlementStateChanged,
} from "@/lib/checkout-flow";

describe("checkout-flow wrappers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createTransaction forwards params to SDK", async () => {
    (sdk.createCheckoutTransaction as any).mockResolvedValue({
      transaction: { id: "tx_1" },
      sessionToken: "dct_x",
      sessionExpiresAt: new Date(),
    });
    const res = await createTransaction({
      amount: "10.00",
      currency: "USD",
      destinationAddresses: [{ address: "0xabc", chain: "ETH" as any }],
      memo: { externalId: "ext_1" },
    });
    expect(sdk.createCheckoutTransaction).toHaveBeenCalledWith({
      amount: "10.00",
      currency: "USD",
      destinationAddresses: [{ address: "0xabc", chain: "ETH" }],
      memo: { externalId: "ext_1" },
    });
    expect(res.transaction.id).toBe("tx_1");
  });

  it("attachWalletSource forwards wallet params", async () => {
    (sdk.attachCheckoutTransactionSource as any).mockResolvedValue({ id: "tx_1" });
    await attachWalletSource({
      transactionId: "tx_1",
      fromAddress: "0xabc",
      fromChainId: "1",
      fromChainName: "ETH" as any,
    });
    expect(sdk.attachCheckoutTransactionSource).toHaveBeenCalledWith({
      sourceType: "wallet",
      transactionId: "tx_1",
      fromAddress: "0xabc",
      fromChainId: "1",
      fromChainName: "ETH",
    });
  });

  it("getQuote forwards params", async () => {
    (sdk.getCheckoutTransactionQuote as any).mockResolvedValue({ id: "tx_1" });
    await getQuote({ transactionId: "tx_1", fromTokenAddress: "0xtoken" });
    expect(sdk.getCheckoutTransactionQuote).toHaveBeenCalledWith({
      transactionId: "tx_1",
      fromTokenAddress: "0xtoken",
    });
  });

  it("submit forwards params + onStepChange", async () => {
    (sdk.submitCheckoutTransaction as any).mockResolvedValue({ id: "tx_1" });
    const onStepChange = vi.fn();
    const walletAccount: any = { address: "0xabc" };
    await submit({ transactionId: "tx_1", walletAccount, onStepChange });
    expect(sdk.submitCheckoutTransaction).toHaveBeenCalledWith({
      transactionId: "tx_1",
      walletAccount,
      onStepChange,
    });
  });

  it("cancel forwards transactionId", async () => {
    (sdk.cancelCheckoutTransaction as any).mockResolvedValue({ id: "tx_1" });
    await cancel({ transactionId: "tx_1" });
    expect(sdk.cancelCheckoutTransaction).toHaveBeenCalledWith({ transactionId: "tx_1" });
  });

  it("onExecutionStateChanged subscribes via onEvent", () => {
    const listener = vi.fn();
    const unsub = onExecutionStateChanged(listener);
    expect(sdk.onEvent).toHaveBeenCalled();
    const [config] = (sdk.onEvent as any).mock.calls[0];
    expect(config.event).toBe("checkoutTransactionExecutionStateChanged");
    expect(typeof unsub).toBe("function");
  });

  it("onSettlementStateChanged subscribes via onEvent", () => {
    const listener = vi.fn();
    onSettlementStateChanged(listener);
    const [config] = (sdk.onEvent as any).mock.calls[0];
    expect(config.event).toBe("checkoutTransactionSettlementStateChanged");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @dynamic-demos/checkouts vitest run __tests__/checkout-flow/wrappers.test.ts`
Expected: FAIL — `@/lib/checkout-flow` does not resolve.

- [ ] **Step 3: Create the wrapper module**

`apps/checkouts/lib/checkout-flow/index.ts`:

```typescript
"use client";

/**
 * Dynamic Checkout Flow — thin SSR-safe wrappers.
 *
 * Mirrors the pattern in `lib/dynamicClient.ts`: each wrapper forwards to the
 * underlying Dynamic SDK function and re-exports the parameter / response
 * types. Centralises the SDK surface this app uses so test mocks and future
 * SDK changes have a single touchpoint.
 *
 * IMPORTANT: All Checkout Flow API calls go through this module. The rest of
 * the app should import from "@/lib/checkout-flow", not directly from
 * "@dynamic-labs-sdk/client".
 */

import {
  createCheckoutTransaction as sdkCreate,
  attachCheckoutTransactionSource as sdkAttach,
  getCheckoutTransactionQuote as sdkGetQuote,
  submitCheckoutTransaction as sdkSubmit,
  getCheckoutTransaction as sdkGet,
  cancelCheckoutTransaction as sdkCancel,
  onEvent,
  type CheckoutTransaction,
  type CheckoutTransactionCreateResponse,
  type CreateCheckoutTransactionParams,
  type GetCheckoutTransactionQuoteParams,
  type SubmitCheckoutTransactionParams,
  type CancelCheckoutTransactionParams,
  type GetCheckoutTransactionParams,
  type AttachCheckoutTransactionSourceParams,
  type CheckoutTransactionExecutionStateChangedEvent,
  type CheckoutTransactionSettlementStateChangedEvent,
} from "@dynamic-labs-sdk/client";
import type { Chain } from "@dynamic-labs-sdk/client";

export type {
  CheckoutTransaction,
  CheckoutTransactionCreateResponse,
  CheckoutTransactionExecutionStateChangedEvent,
  CheckoutTransactionSettlementStateChangedEvent,
};

export type WalletSourceParams = {
  transactionId: string;
  fromAddress: string;
  fromChainId: string;
  fromChainName: Chain;
};

export const createTransaction = (
  params: CreateCheckoutTransactionParams,
): Promise<CheckoutTransactionCreateResponse> => sdkCreate(params);

export const attachWalletSource = (
  params: WalletSourceParams,
): Promise<CheckoutTransaction> =>
  sdkAttach({ sourceType: "wallet", ...params } as AttachCheckoutTransactionSourceParams);

export const getQuote = (
  params: GetCheckoutTransactionQuoteParams,
): Promise<CheckoutTransaction> => sdkGetQuote(params);

export const submit = (
  params: SubmitCheckoutTransactionParams,
): Promise<CheckoutTransaction> => sdkSubmit(params);

export const getTransaction = (
  params: GetCheckoutTransactionParams,
): Promise<CheckoutTransaction> => sdkGet(params);

export const cancel = (
  params: CancelCheckoutTransactionParams,
): Promise<CheckoutTransaction> => sdkCancel(params);

export const onExecutionStateChanged = (
  listener: (e: CheckoutTransactionExecutionStateChangedEvent) => void,
): (() => void) =>
  onEvent({ event: "checkoutTransactionExecutionStateChanged", listener }) ?? (() => {});

export const onSettlementStateChanged = (
  listener: (e: CheckoutTransactionSettlementStateChangedEvent) => void,
): (() => void) =>
  onEvent({ event: "checkoutTransactionSettlementStateChanged", listener }) ?? (() => {});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @dynamic-demos/checkouts vitest run __tests__/checkout-flow/wrappers.test.ts`
Expected: PASS — 7/7.

- [ ] **Step 5: Run full typecheck**

Run: `pnpm --filter @dynamic-demos/checkouts typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/checkouts/lib/checkout-flow/index.ts apps/checkouts/__tests__/checkout-flow/wrappers.test.ts
git commit -m "feat(checkouts): add SSR-safe Dynamic Checkout Flow wrappers"
```

---

## Task 2: Status mapper (pure function)

**Files:**
- Create: `apps/checkouts/lib/checkout-flow/status-map.ts`
- Test: `apps/checkouts/__tests__/checkout-flow/status-map.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/checkouts/__tests__/checkout-flow/status-map.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { mapTransactionToUpdate } from "@/lib/checkout-flow/status-map";
import type { CheckoutTransaction } from "@/lib/checkout-flow";

// Stable test fixture builder
const tx = (overrides: Partial<CheckoutTransaction> = {}): CheckoutTransaction =>
  ({
    id: "tx_1",
    checkoutId: "ck_1",
    amount: "10.00",
    currency: "USD",
    quoteVersion: 1,
    executionState: "initiated",
    settlementState: "none",
    riskState: "cleared" as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as CheckoutTransaction;

describe("mapTransactionToUpdate", () => {
  it("initiated/none → PENDING on step 0 (TRANSFER when no conversion)", () => {
    const u = mapTransactionToUpdate(tx({ executionState: "initiated" }), {
      needsConversion: false,
      totalSteps: 3,
      isCrossChain: false,
    });
    expect(u).toMatchObject({
      stepIndex: 0,
      totalSteps: 3,
      status: "PENDING",
      processType: "TRANSFER",
    });
  });

  it("initiated/none → PENDING on step 0 (SWAP when conversion needed)", () => {
    const u = mapTransactionToUpdate(tx({ executionState: "initiated" }), {
      needsConversion: true,
      totalSteps: 3,
      isCrossChain: false,
    });
    expect(u.processType).toBe("SWAP");
  });

  it("signing → ACTION_REQUIRED on step 0", () => {
    const u = mapTransactionToUpdate(tx({ executionState: "signing" }), {
      needsConversion: false,
      totalSteps: 3,
      isCrossChain: false,
    });
    expect(u).toMatchObject({ stepIndex: 0, status: "ACTION_REQUIRED" });
  });

  it("broadcasted with txHash → RUNNING on step 1, txHash forwarded", () => {
    const u = mapTransactionToUpdate(
      tx({ executionState: "broadcasted", txHash: "0xdead" }),
      { needsConversion: true, totalSteps: 3, isCrossChain: false },
    );
    expect(u).toMatchObject({
      stepIndex: 1,
      status: "RUNNING",
      txHash: "0xdead",
      processType: "SWAP",
    });
  });

  it("source_confirmed/bridging → CROSS_CHAIN on step 2 with isBridging flag", () => {
    const u = mapTransactionToUpdate(
      tx({ executionState: "source_confirmed", settlementState: "bridging" }),
      { needsConversion: true, totalSteps: 4, isCrossChain: true },
    );
    expect(u).toMatchObject({
      stepIndex: 2,
      status: "RUNNING",
      processType: "CROSS_CHAIN",
      isCrossChain: true,
      isBridging: true,
    });
  });

  it("source_confirmed/swapping → SWAP on last step", () => {
    const u = mapTransactionToUpdate(
      tx({ executionState: "source_confirmed", settlementState: "swapping" }),
      { needsConversion: true, totalSteps: 3, isCrossChain: false },
    );
    expect(u).toMatchObject({ stepIndex: 2, status: "RUNNING", processType: "SWAP" });
  });

  it("source_confirmed/settling → RECEIVING on last step", () => {
    const u = mapTransactionToUpdate(
      tx({ executionState: "source_confirmed", settlementState: "settling" }),
      { needsConversion: true, totalSteps: 3, isCrossChain: false },
    );
    expect(u).toMatchObject({ stepIndex: 2, status: "RUNNING", processType: "RECEIVING" });
  });

  it("source_confirmed/completed → DONE on last step", () => {
    const u = mapTransactionToUpdate(
      tx({ executionState: "source_confirmed", settlementState: "completed" }),
      { needsConversion: false, totalSteps: 2, isCrossChain: false },
    );
    expect(u).toMatchObject({ stepIndex: 1, status: "DONE", processType: "RECEIVING" });
  });

  it("executionState failed → FAILED at current step", () => {
    const u = mapTransactionToUpdate(
      tx({ executionState: "failed", settlementState: "none" }),
      { needsConversion: false, totalSteps: 2, isCrossChain: false, currentStepIndex: 1 },
    );
    expect(u).toMatchObject({ status: "FAILED", stepIndex: 1 });
  });

  it("executionState cancelled → FAILED at current step", () => {
    const u = mapTransactionToUpdate(
      tx({ executionState: "cancelled" }),
      { needsConversion: false, totalSteps: 2, isCrossChain: false, currentStepIndex: 0 },
    );
    expect(u).toMatchObject({ status: "FAILED", stepIndex: 0 });
  });

  it("executionState expired → FAILED", () => {
    const u = mapTransactionToUpdate(
      tx({ executionState: "expired" }),
      { needsConversion: false, totalSteps: 2, isCrossChain: false, currentStepIndex: 0 },
    );
    expect(u.status).toBe("FAILED");
  });

  it("settlementState failed → FAILED even if execution looks fine", () => {
    const u = mapTransactionToUpdate(
      tx({ executionState: "source_confirmed", settlementState: "failed" }),
      { needsConversion: true, totalSteps: 3, isCrossChain: false, currentStepIndex: 2 },
    );
    expect(u.status).toBe("FAILED");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @dynamic-demos/checkouts vitest run __tests__/checkout-flow/status-map.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the mapper**

`apps/checkouts/lib/checkout-flow/status-map.ts`:

```typescript
import type { CheckoutTransaction } from "@/lib/checkout-flow";
import type { ExecutionUpdate } from "@/lib/types";

export interface MapContext {
  /** True iff the source token differs from the settlement token (or chain). */
  needsConversion: boolean;
  /** Total UI steps as generated by generateTransactionSteps. */
  totalSteps: number;
  /** True iff source chain ≠ destination chain. */
  isCrossChain: boolean;
  /** UI step index to mark FAILED on terminal failure; defaults to 0. */
  currentStepIndex?: number;
}

/**
 * Translate a Dynamic CheckoutTransaction state snapshot into the
 * ExecutionUpdate shape the existing payment-widget UI already consumes.
 *
 * This function is pure: same inputs → same output. All UI step-list logic
 * lives in components/payment-modal/transaction-progress-screen.tsx; this
 * mapper only decides which step is active and what status it carries.
 */
export function mapTransactionToUpdate(
  transaction: CheckoutTransaction,
  ctx: MapContext,
): ExecutionUpdate {
  const { needsConversion, totalSteps, isCrossChain, currentStepIndex = 0 } = ctx;
  const lastStep = Math.max(0, totalSteps - 1);
  const baseProcess: ExecutionUpdate["processType"] = needsConversion
    ? "SWAP"
    : "TRANSFER";

  // Terminal failures take priority — short-circuit before reading other state.
  if (
    transaction.executionState === "failed" ||
    transaction.executionState === "expired" ||
    transaction.executionState === "cancelled" ||
    transaction.settlementState === "failed"
  ) {
    return {
      stepIndex: currentStepIndex,
      totalSteps,
      status: "FAILED",
      processType: baseProcess,
    };
  }

  // Settlement state takes precedence over execution state once we're past broadcast.
  if (transaction.executionState === "source_confirmed") {
    switch (transaction.settlementState) {
      case "bridging":
        return {
          stepIndex: Math.min(2, lastStep),
          totalSteps,
          status: "RUNNING",
          processType: "CROSS_CHAIN",
          isCrossChain,
          isBridging: true,
          txHash: transaction.txHash,
        };
      case "swapping":
        return {
          stepIndex: lastStep,
          totalSteps,
          status: "RUNNING",
          processType: "SWAP",
          txHash: transaction.txHash,
        };
      case "settling":
        return {
          stepIndex: lastStep,
          totalSteps,
          status: "RUNNING",
          processType: "RECEIVING",
          txHash: transaction.txHash,
        };
      case "completed":
        return {
          stepIndex: lastStep,
          totalSteps,
          status: "DONE",
          processType: "RECEIVING",
          txHash: transaction.txHash,
        };
      // routing / none → fall through to broadcasted-style RUNNING below
    }
  }

  // Execution state drives early steps.
  switch (transaction.executionState) {
    case "initiated":
    case "source_attached":
    case "quoted":
      return {
        stepIndex: 0,
        totalSteps,
        status: "PENDING",
        processType: baseProcess,
      };
    case "signing":
      return {
        stepIndex: 0,
        totalSteps,
        status: "ACTION_REQUIRED",
        processType: baseProcess,
      };
    case "broadcasted":
    case "source_confirmed":
      return {
        stepIndex: 1,
        totalSteps,
        status: "RUNNING",
        processType: baseProcess,
        txHash: transaction.txHash,
      };
  }

  // Defensive fallback — shouldn't happen if SDK is current.
  return {
    stepIndex: currentStepIndex,
    totalSteps,
    status: "PENDING",
    processType: baseProcess,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @dynamic-demos/checkouts vitest run __tests__/checkout-flow/status-map.test.ts`
Expected: PASS — 12/12.

- [ ] **Step 5: Commit**

```bash
git add apps/checkouts/lib/checkout-flow/status-map.ts apps/checkouts/__tests__/checkout-flow/status-map.test.ts
git commit -m "feat(checkouts): add Checkout Flow → ExecutionUpdate status mapper"
```

---

## Task 3: `useCheckoutFlow` hook — begin + quote

**Files:**
- Create: `apps/checkouts/hooks/use-checkout-flow.ts`
- Test: `apps/checkouts/__tests__/use-checkout-flow.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/checkouts/__tests__/use-checkout-flow.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/checkout-flow", () => ({
  createTransaction: vi.fn(),
  attachWalletSource: vi.fn(),
  getQuote: vi.fn(),
  submit: vi.fn(),
  cancel: vi.fn(),
  onExecutionStateChanged: vi.fn(() => () => {}),
  onSettlementStateChanged: vi.fn(() => () => {}),
}));

import * as cf from "@/lib/checkout-flow";
import { useCheckoutFlow } from "@/hooks/use-checkout-flow";

const txFixture = (overrides: any = {}) => ({
  id: "tx_1",
  checkoutId: "ck_1",
  amount: "10.00",
  currency: "USD",
  quoteVersion: 1,
  executionState: "quoted",
  settlementState: "none",
  riskState: "cleared",
  createdAt: new Date(),
  updatedAt: new Date(),
  quote: {
    version: 1,
    fromAmount: "10.0",
    toAmount: "9.95",
    fees: { totalFeeUsd: "0.05" },
    estimatedTimeSec: 30,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
  },
  ...overrides,
});

describe("useCheckoutFlow.beginCheckout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates → attaches wallet source → fetches quote → returns quote", async () => {
    (cf.createTransaction as any).mockResolvedValue({
      transaction: { id: "tx_1" },
      sessionToken: "dct_x",
      sessionExpiresAt: new Date(),
    });
    (cf.attachWalletSource as any).mockResolvedValue({ id: "tx_1" });
    (cf.getQuote as any).mockResolvedValue(txFixture());

    const { result } = renderHook(() => useCheckoutFlow());

    let begin: Awaited<ReturnType<typeof result.current.beginCheckout>>;
    await act(async () => {
      begin = await result.current.beginCheckout({
        amount: "10.00",
        currency: "USD",
        destinationAddresses: [{ address: "0xdest", chain: "ETH" as any }],
        memo: { externalId: "ext_1" },
        source: {
          fromAddress: "0xsource",
          fromChainId: "1",
          fromChainName: "ETH" as any,
        },
        fromTokenAddress: "0xtoken",
      });
    });

    expect(cf.createTransaction).toHaveBeenCalled();
    expect(cf.attachWalletSource).toHaveBeenCalledWith({
      transactionId: "tx_1",
      fromAddress: "0xsource",
      fromChainId: "1",
      fromChainName: "ETH",
    });
    expect(cf.getQuote).toHaveBeenCalledWith({
      transactionId: "tx_1",
      fromTokenAddress: "0xtoken",
    });
    expect(begin!).toMatchObject({
      transactionId: "tx_1",
      transaction: { id: "tx_1" },
    });
    expect(result.current.transactionId).toBe("tx_1");
    expect(result.current.quote).toBeDefined();
  });

  it("surfaces SDK errors on create", async () => {
    (cf.createTransaction as any).mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useCheckoutFlow());

    await act(async () => {
      const ret = await result.current.beginCheckout({
        amount: "10",
        currency: "USD",
        destinationAddresses: [],
        source: { fromAddress: "0x", fromChainId: "1", fromChainName: "ETH" as any },
        fromTokenAddress: "0x",
      });
      expect(ret).toBeNull();
    });
    expect(result.current.error).toContain("boom");
  });
});
```

- [ ] **Step 2: Add `@testing-library/react` dev dep if missing**

Run: `pnpm --filter @dynamic-demos/checkouts list @testing-library/react 2>&1 | grep -q react && echo OK || echo MISSING`

If MISSING:
```bash
pnpm --filter @dynamic-demos/checkouts add -D @testing-library/react@16.0.1
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @dynamic-demos/checkouts vitest run __tests__/use-checkout-flow.test.ts`
Expected: FAIL — `@/hooks/use-checkout-flow` not found.

- [ ] **Step 4: Implement hook (beginCheckout only)**

`apps/checkouts/hooks/use-checkout-flow.ts`:

```typescript
"use client";

/**
 * Dynamic Checkout Flow lifecycle hook.
 *
 * Owns the create → attach → quote → submit → events → cancel lifecycle of a
 * single checkout transaction. Produces ExecutionUpdate payloads in the same
 * shape the existing payment-widget UI already consumes, so the screens and
 * step animations are unchanged.
 *
 * All SDK calls flow through @/lib/checkout-flow (the SSR-safe wrapper).
 */

import { useCallback, useRef, useState } from "react";
import {
  createTransaction,
  attachWalletSource,
  getQuote,
  type CheckoutTransaction,
  type CheckoutTransactionCreateResponse,
} from "@/lib/checkout-flow";
import type {
  CreateCheckoutTransactionParams,
  WalletSourceParams,
} from "@/lib/checkout-flow";
import { formatErrorMessage } from "@/lib/format";

export interface BeginCheckoutParams {
  amount: string;
  currency: string;
  destinationAddresses: CreateCheckoutTransactionParams["destinationAddresses"];
  memo?: object;
  source: Omit<WalletSourceParams, "transactionId">;
  fromTokenAddress: string;
}

export interface BeginCheckoutResult {
  transactionId: string;
  transaction: CheckoutTransaction;
}

export interface UseCheckoutFlowReturn {
  /** Transaction id once created; null before create or after reset. */
  transactionId: string | null;
  /** Latest CheckoutTransaction snapshot (carries quote once fetched). */
  quote: CheckoutTransaction | null;
  /** Latest error message, or null. */
  error: string | null;
  /** Loading flag during begin / submit calls. */
  isLoading: boolean;
  /** Create → attach wallet → quote in one call. Returns null on error. */
  beginCheckout: (params: BeginCheckoutParams) => Promise<BeginCheckoutResult | null>;
  /** Reset state (clear error, transactionId, quote). */
  reset: () => void;
}

export function useCheckoutFlow(): UseCheckoutFlowReturn {
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [quote, setQuote] = useState<CheckoutTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sessionTokenRef = useRef<string | null>(null);

  const beginCheckout = useCallback(
    async (params: BeginCheckoutParams): Promise<BeginCheckoutResult | null> => {
      setError(null);
      setIsLoading(true);
      try {
        const created: CheckoutTransactionCreateResponse = await createTransaction({
          amount: params.amount,
          currency: params.currency,
          destinationAddresses: params.destinationAddresses,
          memo: params.memo,
        });
        sessionTokenRef.current = created.sessionToken;
        const txId = created.transaction.id;
        setTransactionId(txId);

        await attachWalletSource({
          transactionId: txId,
          fromAddress: params.source.fromAddress,
          fromChainId: params.source.fromChainId,
          fromChainName: params.source.fromChainName,
        });

        const quoted = await getQuote({
          transactionId: txId,
          fromTokenAddress: params.fromTokenAddress,
        });
        setQuote(quoted);

        return { transactionId: txId, transaction: quoted };
      } catch (err) {
        setError(formatErrorMessage(err));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setTransactionId(null);
    setQuote(null);
    setError(null);
    setIsLoading(false);
    sessionTokenRef.current = null;
  }, []);

  return { transactionId, quote, error, isLoading, beginCheckout, reset };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @dynamic-demos/checkouts vitest run __tests__/use-checkout-flow.test.ts`
Expected: PASS — 2/2.

- [ ] **Step 6: Commit**

```bash
git add apps/checkouts/hooks/use-checkout-flow.ts apps/checkouts/__tests__/use-checkout-flow.test.ts apps/checkouts/package.json pnpm-lock.yaml
git commit -m "feat(checkouts): add useCheckoutFlow hook with beginCheckout"
```

---

## Task 4: `useCheckoutFlow.submit` — broadcast + state events → ExecutionUpdate

**Files:**
- Modify: `apps/checkouts/hooks/use-checkout-flow.ts`
- Modify: `apps/checkouts/__tests__/use-checkout-flow.test.ts` (append)

- [ ] **Step 1: Append failing test**

Append to `apps/checkouts/__tests__/use-checkout-flow.test.ts`:

```typescript
describe("useCheckoutFlow.submit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls submit, subscribes to state events, emits ExecutionUpdate on each event", async () => {
    let execListener: any;
    let settleListener: any;
    (cf.onExecutionStateChanged as any).mockImplementation((l: any) => {
      execListener = l;
      return () => {};
    });
    (cf.onSettlementStateChanged as any).mockImplementation((l: any) => {
      settleListener = l;
      return () => {};
    });
    (cf.createTransaction as any).mockResolvedValue({
      transaction: { id: "tx_1" },
      sessionToken: "dct_x",
      sessionExpiresAt: new Date(),
    });
    (cf.attachWalletSource as any).mockResolvedValue({ id: "tx_1" });
    (cf.getQuote as any).mockResolvedValue(txFixture());
    (cf.submit as any).mockImplementation(async ({ onStepChange }: any) => {
      onStepChange?.("approval");
      onStepChange?.("transaction");
      return txFixture({ executionState: "broadcasted", txHash: "0xdead" });
    });

    // Patch getTransaction so listener handlers can fetch current snapshot
    (cf as any).getTransaction = vi
      .fn()
      .mockResolvedValueOnce(
        txFixture({ executionState: "broadcasted", txHash: "0xdead" }),
      )
      .mockResolvedValueOnce(
        txFixture({
          executionState: "source_confirmed",
          settlementState: "completed",
          txHash: "0xdead",
        }),
      );

    const updates: any[] = [];
    const onUpdate = (u: any) => updates.push(u);

    const { result } = renderHook(() => useCheckoutFlow());
    await act(async () => {
      await result.current.beginCheckout({
        amount: "10",
        currency: "USD",
        destinationAddresses: [{ address: "0xdest", chain: "ETH" as any }],
        memo: {},
        source: { fromAddress: "0x", fromChainId: "1", fromChainName: "ETH" as any },
        fromTokenAddress: "0x",
      });
    });

    const walletAccount: any = { address: "0x" };

    await act(async () => {
      await result.current.submit({
        walletAccount,
        needsConversion: true,
        totalSteps: 3,
        isCrossChain: false,
        onUpdate,
      });
    });

    // Should have received: ACTION_REQUIRED (approval), RUNNING step 1 (transaction)
    expect(updates.some((u) => u.status === "ACTION_REQUIRED")).toBe(true);
    expect(updates.some((u) => u.status === "RUNNING" && u.stepIndex === 1)).toBe(true);

    // Fire a settlement state change
    await act(async () => {
      await settleListener?.({
        transactionId: "tx_1",
        newState: "completed",
        previousState: "settling",
        timestamp: new Date().toISOString(),
      });
    });

    expect(updates.some((u) => u.status === "DONE")).toBe(true);
  });

  it("submit returns false on SDK error and emits onError", async () => {
    (cf.createTransaction as any).mockResolvedValue({
      transaction: { id: "tx_1" },
      sessionToken: "dct_x",
      sessionExpiresAt: new Date(),
    });
    (cf.attachWalletSource as any).mockResolvedValue({ id: "tx_1" });
    (cf.getQuote as any).mockResolvedValue(txFixture());
    (cf.submit as any).mockRejectedValue(new Error("Action rejected"));
    (cf.onExecutionStateChanged as any).mockReturnValue(() => {});
    (cf.onSettlementStateChanged as any).mockReturnValue(() => {});

    const onRejected = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(() => useCheckoutFlow());
    await act(async () => {
      await result.current.beginCheckout({
        amount: "10",
        currency: "USD",
        destinationAddresses: [{ address: "0xdest", chain: "ETH" as any }],
        memo: {},
        source: { fromAddress: "0x", fromChainId: "1", fromChainName: "ETH" as any },
        fromTokenAddress: "0x",
      });
    });

    let ok: boolean = true;
    await act(async () => {
      ok = await result.current.submit({
        walletAccount: { address: "0x" } as any,
        needsConversion: false,
        totalSteps: 2,
        isCrossChain: false,
        onUpdate: () => {},
        onRejected,
        onError,
      });
    });
    expect(ok).toBe(false);
    expect(onRejected).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @dynamic-demos/checkouts vitest run __tests__/use-checkout-flow.test.ts -t "useCheckoutFlow.submit"`
Expected: FAIL — `result.current.submit` is not a function.

- [ ] **Step 3: Extend the hook with submit**

Edit `apps/checkouts/hooks/use-checkout-flow.ts`:

Add these imports at the top of the file (after existing imports):

```typescript
import {
  submit as sdkSubmit,
  cancel as sdkCancel,
  getTransaction,
  onExecutionStateChanged,
  onSettlementStateChanged,
} from "@/lib/checkout-flow";
import type { WalletAccount } from "@/lib/dynamicClient";
import type { ExecutionUpdate } from "@/lib/types";
import { mapTransactionToUpdate } from "@/lib/checkout-flow/status-map";
import { isUserRejection } from "@/lib/format";
```

Remove the duplicate `createTransaction, attachWalletSource, getQuote` import block from step 4 of Task 3 and consolidate the imports into a single block. The final imports section should be:

```typescript
import { useCallback, useRef, useState } from "react";
import {
  createTransaction,
  attachWalletSource,
  getQuote,
  submit as sdkSubmit,
  cancel as sdkCancel,
  getTransaction,
  onExecutionStateChanged,
  onSettlementStateChanged,
  type CheckoutTransaction,
  type CheckoutTransactionCreateResponse,
} from "@/lib/checkout-flow";
import type {
  CreateCheckoutTransactionParams,
  WalletSourceParams,
} from "@/lib/checkout-flow";
import type { WalletAccount } from "@/lib/dynamicClient";
import type { ExecutionUpdate } from "@/lib/types";
import { mapTransactionToUpdate } from "@/lib/checkout-flow/status-map";
import { formatErrorMessage, isUserRejection } from "@/lib/format";
```

Add these types after `BeginCheckoutResult`:

```typescript
export interface SubmitParams {
  walletAccount: WalletAccount;
  needsConversion: boolean;
  totalSteps: number;
  isCrossChain: boolean;
  onUpdate: (update: ExecutionUpdate) => void;
  onRejected?: () => void;
  onError?: () => void;
}
```

Extend the `UseCheckoutFlowReturn` interface:

```typescript
export interface UseCheckoutFlowReturn {
  transactionId: string | null;
  quote: CheckoutTransaction | null;
  error: string | null;
  isLoading: boolean;
  beginCheckout: (params: BeginCheckoutParams) => Promise<BeginCheckoutResult | null>;
  submit: (params: SubmitParams) => Promise<boolean>;
  cancel: () => Promise<void>;
  reset: () => void;
}
```

Add a `currentStepIndexRef` next to `sessionTokenRef`:

```typescript
const currentStepIndexRef = useRef(0);
```

Add the `submit` and `cancel` callbacks inside the hook (before the return statement):

```typescript
const submit = useCallback(
  async (params: SubmitParams): Promise<boolean> => {
    const txId = transactionId;
    if (!txId) {
      setError("No transaction to submit");
      return false;
    }

    const {
      walletAccount,
      needsConversion,
      totalSteps,
      isCrossChain,
      onUpdate,
      onRejected,
      onError,
    } = params;

    setError(null);
    setIsLoading(true);
    currentStepIndexRef.current = 0;

    const ctx = { needsConversion, totalSteps, isCrossChain } as const;

    const handleSnapshot = (tx: CheckoutTransaction) => {
      const update = mapTransactionToUpdate(tx, {
        ...ctx,
        currentStepIndex: currentStepIndexRef.current,
      });
      currentStepIndexRef.current = update.stepIndex;
      onUpdate(update);
    };

    const unsubExec = onExecutionStateChanged(async (e) => {
      if (e.transactionId !== txId) return;
      const snapshot = await getTransaction({ transactionId: txId });
      handleSnapshot(snapshot);
    });
    const unsubSettle = onSettlementStateChanged(async (e) => {
      if (e.transactionId !== txId) return;
      const snapshot = await getTransaction({ transactionId: txId });
      handleSnapshot(snapshot);
    });

    try {
      await sdkSubmit({
        transactionId: txId,
        walletAccount,
        onStepChange: (step) => {
          if (step === "approval") {
            onUpdate({
              stepIndex: 0,
              totalSteps,
              status: "ACTION_REQUIRED",
              processType: needsConversion ? "SWAP" : "TRANSFER",
            });
            currentStepIndexRef.current = 0;
          } else if (step === "transaction") {
            onUpdate({
              stepIndex: 1,
              totalSteps,
              status: "RUNNING",
              processType: needsConversion ? "SWAP" : "TRANSFER",
            });
            currentStepIndexRef.current = 1;
          }
        },
      });
      return true;
    } catch (err) {
      if (isUserRejection(err)) {
        onRejected?.();
      } else {
        setError(formatErrorMessage(err));
        onError?.();
        onUpdate({
          stepIndex: currentStepIndexRef.current,
          totalSteps,
          status: "FAILED",
          processType: needsConversion ? "SWAP" : "TRANSFER",
        });
      }
      return false;
    } finally {
      unsubExec();
      unsubSettle();
      setIsLoading(false);
    }
  },
  [transactionId],
);

const cancel = useCallback(async (): Promise<void> => {
  if (!transactionId) return;
  try {
    await sdkCancel({ transactionId });
  } catch {
    // Cancel-of-cancelled is non-fatal — swallow.
  }
}, [transactionId]);
```

Update the return statement to include `submit` and `cancel`:

```typescript
return { transactionId, quote, error, isLoading, beginCheckout, submit, cancel, reset };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @dynamic-demos/checkouts vitest run __tests__/use-checkout-flow.test.ts`
Expected: PASS — all submit tests pass.

- [ ] **Step 5: Run typecheck**

Run: `pnpm --filter @dynamic-demos/checkouts typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/checkouts/hooks/use-checkout-flow.ts apps/checkouts/__tests__/use-checkout-flow.test.ts
git commit -m "feat(checkouts): add submit + state event handling to useCheckoutFlow"
```

---

## Task 5: Wire `useCheckoutFlow` into the payment widget (wallet branch)

This is the largest task. The Kraken branch is verbatim; only the wallet branch of `use-payment-execution.ts` and the quote-fetching in `use-payment-actions.ts` change.

**Files:**
- Modify: `apps/checkouts/components/payment-widget/use-payment-execution.ts`
- Modify: `apps/checkouts/components/payment-widget/use-payment-actions.ts`
- Modify: `apps/checkouts/components/payment-widget/utils.ts` (drop LI.FI-specific helpers)

- [ ] **Step 1: Open `use-payment-actions.ts` and replace the `useLiFi` orchestration with `useCheckoutFlow`**

Read the file first to find the existing `useLiFi()` call. Replace:

```typescript
import { useLiFi, type ExecutionUpdate } from "@/hooks/use-lifi";
```

with:

```typescript
import { useCheckoutFlow } from "@/hooks/use-checkout-flow";
import type { ExecutionUpdate } from "@/lib/types";
```

Replace the `const lifi = useLiFi(...)` instantiation with:

```typescript
const checkoutFlow = useCheckoutFlow();
```

Drop all LI.FI-specific quote fetching from this hook (it now lives inside `useCheckoutFlow.beginCheckout`). The `handleTokenSelect` function should call `checkoutFlow.beginCheckout(...)` instead of `lifi.getTransactionQuote(...)`. Adapt the call site to map the existing `WidgetConfig.settlement` shape to `destinationAddresses` and `currency`:

```typescript
const handleTokenSelect = useCallback(
  async (token: TokenAsset) => {
    // ... existing pre-checks unchanged (kraken, embedded wallet ensure, etc.)
    const primaryWallet = getPrimaryWalletAccount();
    if (!primaryWallet?.address || !config.settlement) return;

    const begin = await checkoutFlow.beginCheckout({
      amount: getCurrentAmount().toString(),
      currency: config.settlement.tokenSymbol ?? "USD",
      destinationAddresses: [
        {
          address: await getRecipientAddress(primaryWallet.address),
          chain: config.settlement.chainName as any,
        },
      ],
      memo: {
        externalId: trackedTransaction?.externalId,
        widgetMetadata: trackedTransaction?.metadata,
      },
      source: {
        fromAddress: primaryWallet.address,
        fromChainId: String(token.chainId),
        fromChainName: token.chainName as any,
      },
      fromTokenAddress: getTokenAddress(token),
    });

    if (!begin) return; // error already in checkoutFlow.error

    goToReview(getCurrentAmount(), token);
  },
  [
    config,
    checkoutFlow,
    getCurrentAmount,
    goToReview,
    getRecipientAddress,
    trackedTransaction,
  ],
);
```

In the returned object replace `quote: lifi.quote` with a derived quote that pulls from `checkoutFlow.quote.quote` (the SDK's CheckoutTransaction has a `.quote` sub-object). Add a helper:

```typescript
const reviewQuote = useMemo(() => {
  if (!checkoutFlow.quote?.quote) return null;
  const q = checkoutFlow.quote.quote;
  return {
    fromAmount: q.fromAmount,
    toAmount: q.toAmount,
    totalFeeUsd: q.fees?.totalFeeUsd,
    estimatedTimeSec: q.estimatedTimeSec,
  };
}, [checkoutFlow.quote]);
```

Pass `reviewQuote` to consumers where `lifi.quote` was previously consumed.

The hook's `usePaymentExecution(...)` call now receives a different `lifi`-shaped argument. Update to pass `{ checkoutFlow }` instead and rename the destructuring in step 2.

- [ ] **Step 2: Replace `lifi.executeSwap` etc. in `use-payment-execution.ts` with `checkoutFlow.submit`**

In `use-payment-execution.ts`, replace the `LiFiFunctions` type with:

```typescript
export interface CheckoutFlowFunctions {
  quote: ReturnType<typeof useCheckoutFlow>["quote"];
  transactionId: ReturnType<typeof useCheckoutFlow>["transactionId"];
  submit: ReturnType<typeof useCheckoutFlow>["submit"];
  cancel: ReturnType<typeof useCheckoutFlow>["cancel"];
}
```

Replace the `lifi: LiFiFunctions` field on the options with `checkoutFlow: CheckoutFlowFunctions`.

Inside `handleConfirmPayment`, the wallet branch becomes:

```typescript
const primaryWallet = getPrimaryWalletAccount();
if (!primaryWallet?.address) return;

const isCrossChain = token.chainId !== settlement?.chainId;
const needsConversion = needsTokenConversion(token, settlement);

const initialSteps = generateTransactionSteps(
  config.mode,
  needsConversion,
  token.symbol,
  settlement?.tokenSymbol ?? token.symbol,
);
if (initialSteps[0]) initialSteps[0].status = "active";
goToProcessing(amount, token, initialSteps);

const exec = executionRef.current;
exec.submitted = false;
exec.failureHandled = false;
exec.userRejected = false;
exec.hasTxHash = false;

const onUpdate = (update: ExecutionUpdate) => {
  if (update.txHash) exec.hasTxHash = true;
  updateProcessingSteps(update);

  // Dual-write to dashboard mirror on first txHash (preserved from before)
  if (update.txHash && trackedTransaction && !exec.submitted) {
    exec.submitted = true;
    submitTrackedTransaction(update.txHash);
  }

  // Dashboard mirror: failure / cancel branches (preserved)
  if (
    update.status === "FAILED" &&
    trackedTransaction &&
    !exec.failureHandled
  ) {
    exec.failureHandled = true;
    const isCancellation = exec.userRejected || !exec.hasTxHash;
    if (isCancellation) {
      cancelTransaction(checkoutId, trackedTransaction.id).catch(() => {
        exec.failureHandled = false;
      });
    } else {
      failTransaction(checkoutId, trackedTransaction.id, "Transaction failed").catch(
        () => {
          exec.failureHandled = false;
        },
      );
    }
  }
};

const onRejected = () => {
  exec.userRejected = true;
  onUpdate({
    stepIndex: 0,
    totalSteps: initialSteps.length,
    status: "FAILED",
    processType: needsConversion ? "SWAP" : "TRANSFER",
  });
};

await checkoutFlow.submit({
  walletAccount: primaryWallet,
  needsConversion,
  totalSteps: initialSteps.length,
  isCrossChain,
  onUpdate,
  onRejected,
});
```

Delete the direct-transfer branch (`if (!needsConversion) { lifi.executeDirectTransfer(...) }`) and the Solana-specific transfer branch — `checkoutFlow.submit` handles both cases.

- [ ] **Step 3: Drop LI.FI-only helpers from `payment-widget/utils.ts`**

Remove `isImmutableQuoteStatus` if it was LI.FI-specific. Keep `needsTokenConversion` and `getTokenAddress` (still used by Checkout Flow path). Grep first:

```bash
grep -rn "isImmutableQuoteStatus" apps/checkouts/
```

If only used in `use-payment-actions.ts` (likely tied to LI.FI quote refresh), delete from utils.ts and remove the consumer.

- [ ] **Step 4: Run typecheck**

Run: `pnpm --filter @dynamic-demos/checkouts typecheck`
Expected: PASS. (LI.FI imports still exist in `use-lifi/` directory — Task 6 removes them. They should not be imported anywhere outside that directory at this point.)

If typecheck reports dangling LI.FI references outside `hooks/use-lifi/`, audit and fix before committing.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @dynamic-demos/checkouts test`
Expected: PASS — existing `__tests__/dynamic-client-singleton.test.ts` + new tests pass.

- [ ] **Step 6: Manual smoke (optional but recommended)**

Run: `pnpm --filter @dynamic-demos/checkouts dev`

Walk through one demo config end-to-end. Verify wallet prompts during submission (the original symptom is gone).

- [ ] **Step 7: Commit**

```bash
git add apps/checkouts/components/payment-widget/use-payment-actions.ts apps/checkouts/components/payment-widget/use-payment-execution.ts apps/checkouts/components/payment-widget/utils.ts
git commit -m "refactor(checkouts): wire useCheckoutFlow into payment-widget wallet path"
```

---

## Task 6: Drop `@lifi/sdk` and `@dynamic-demos/lifi`

**Files:**
- Delete: `apps/checkouts/hooks/use-lifi/` (entire dir)
- Delete: `apps/checkouts/lib/actions/lifi.ts`
- Delete: `apps/checkouts/lib/actions/` if empty
- Modify: `apps/checkouts/package.json` — drop deps
- Modify: `apps/checkouts/lib/widget-config.ts` — drop `toLiFiChainId`, `LIFI_SOLANA_CHAIN_ID`
- Modify: `apps/checkouts/lib/types.ts` — drop LI.FI route types

- [ ] **Step 1: Confirm no consumers remain**

Run:
```bash
grep -rn --include="*.ts" --include="*.tsx" "@lifi/sdk\|@dynamic-demos/lifi\|@/hooks/use-lifi\|@/lib/actions/lifi\|toLiFiChainId\|LIFI_SOLANA_CHAIN_ID" apps/checkouts/ | grep -v "apps/checkouts/hooks/use-lifi" | grep -v "apps/checkouts/lib/actions/lifi.ts"
```

Expected: no output (no consumers outside the files we're deleting).

If output appears, stop and fix the dangling consumer in Task 5 before continuing.

- [ ] **Step 2: Delete LI.FI source files**

```bash
git rm -r apps/checkouts/hooks/use-lifi
git rm apps/checkouts/lib/actions/lifi.ts
rmdir apps/checkouts/lib/actions 2>/dev/null || true
```

- [ ] **Step 3: Remove deps from `apps/checkouts/package.json`**

Edit `apps/checkouts/package.json` and remove these two dependency lines:

```json
    "@dynamic-demos/lifi": "workspace:*",
    "@lifi/sdk": "catalog:",
```

- [ ] **Step 4: Drop LI.FI helpers from `lib/widget-config.ts`**

Read the file, identify `toLiFiChainId` and `LIFI_SOLANA_CHAIN_ID` exports, and remove them. If `isSolanaChainId` was implemented using `LIFI_SOLANA_CHAIN_ID`, replace its body with the literal value (Solana mainnet-beta chain id is `1151111081099710` in LI.FI's space, but the Checkout Flow uses Dynamic's `Chain` enum — leave `isSolanaChainId` checking against the EVM chainId set instead, OR delete it if no remaining consumer).

Grep first to decide:
```bash
grep -rn "isSolanaChainId" apps/checkouts/
```

If only Checkout Flow path uses it, redefine using Dynamic's `Chain` enum.

- [ ] **Step 5: Drop LI.FI route types from `lib/types.ts`**

Open `apps/checkouts/lib/types.ts`, find `QuoteResult`, `GetRoutesParams`, `Route`, and any other LI.FI-shaped types still referenced. Remove anything that's no longer imported. Keep `ExecutionUpdate`, `ExecutionStatus`, `Transaction`, `TransactionStatus`, `InitializeTransactionParams`, `UpdateTransactionParams` — these are still consumed by the dashboard mirror and the status mapper.

- [ ] **Step 6: Reinstall and typecheck**

```bash
pnpm install
pnpm --filter @dynamic-demos/checkouts typecheck
pnpm --filter @dynamic-demos/checkouts test
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add apps/checkouts/ pnpm-lock.yaml
git commit -m "chore(checkouts): drop @lifi/sdk and @dynamic-demos/lifi"
```

---

## Task 7: Update `AGENTS.md`

**Files:**
- Modify: `apps/checkouts/AGENTS.md`

- [ ] **Step 1: Read current AGENTS.md**

Note current sections: Capabilities, Public surface, Required environment, Theming, Credentials, Slots vs invariants, Data boundaries, Deployment, Integration map, Examples, Do / Don't, Open questions.

- [ ] **Step 2: Edit narrative**

Replace the opening narrative (currently "Showcases the Dynamic embedded wallet + LI.FI bridge SDK pattern...") with:

```markdown
Stablecoin checkout / pay-with-crypto demo. End users authenticate via Dynamic, view a multichain balance summary, and complete a checkout that may bridge/swap across chains via Dynamic Checkout Flow. Showcases the Dynamic embedded wallet + Dynamic Checkout Flow pattern when paired with a CeFi balance source (Kraken via Dynamic CeFi connector).
```

Replace LI.FI capability bullet with:

```markdown
- Cross-chain bridge / swap setup via the Dynamic Checkout Flow SDK (`@dynamic-labs-sdk/client`).
```

Replace the Slots vs invariants list:
- Remove the "All bridge / swap quotes go through dashboard `/api/orchestrate/swap`" invariant
- Remove the "Browser-side LI.FI SDK setup goes through `configureLifi`" invariant
- Remove the "Sandbox-by-default for the LI.FI environment seam" invariant
- Add: "All Checkout Flow API calls go through `@/lib/checkout-flow` — never directly from `@dynamic-labs-sdk/client` elsewhere in the app."
- Add: "The Checkout Flow primitives sign and broadcast on the user's behalf; the app never holds keys."

Replace the Examples block with:

```markdown
```ts
// hooks/use-checkout-flow.ts
import { createTransaction, submit } from "@/lib/checkout-flow";
// SDK lifecycle: create → attach → quote → submit → events → cancel
```
```

Update the Do / Don't list:
- Replace "Do: route quote + status reads through `/api/orchestrate/swap`" with "Do: route all Checkout Flow calls through `@/lib/checkout-flow`."
- Replace "Don't: import `@dynamic-demos/lifi/client`" with "Don't: import `@dynamic-labs-sdk/client` Checkout Flow functions directly from components — use the `@/lib/checkout-flow` wrapper."

Update the Integration map:
- Remove `@dynamic-demos/lifi` from "Imports"
- (Other entries unchanged)

Update Data boundaries:
```markdown
- Redis: not used directly by this app. Dashboard transient transaction state remains Redis-backed; this app reads/writes that state via the dashboard API.
- Canonical transactions: Dynamic Checkout Flow is the routing source of truth. The dashboard transaction mirror is dual-written from each lifecycle transition (initialize → update with `dynamicTransactionId` → submit with `txHash` → done/fail/cancel).
```

- [ ] **Step 3: Verify everything resolves**

```bash
pnpm --filter @dynamic-demos/checkouts typecheck
pnpm --filter @dynamic-demos/checkouts lint
pnpm --filter @dynamic-demos/checkouts test
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add apps/checkouts/AGENTS.md
git commit -m "docs(checkouts): update AGENTS.md for Checkout Flow primary path"
```

---

## Task 8: Manual UI/UX parity smoke (no code, gating)

This task verifies §6 UI/UX preservation invariants from the spec. No code changes.

- [ ] **Step 1: Run dev server**

```bash
pnpm --filter @dynamic-demos/checkouts dev
```

Expected: server starts on `http://localhost:4001`.

- [ ] **Step 2: Walk through each existing demo config**

For each `?theme=<id>` demo config currently in the dashboard:
- Sign in with Dynamic
- Pick a token + amount
- Verify review screen shows: rate, fees, gas, ETA fields populated (no `—` placeholders for fields that previously had data)
- Confirm payment
- Verify the wallet prompts to sign
- Verify the processing screen step sequence matches the pre-migration flow:
  - Step 0 active → ACTION_REQUIRED on signature prompt
  - Step 1 RUNNING with txHash visible after broadcast
  - For cross-chain: step 2 with bridging indicator
  - Final step DONE on completion

- [ ] **Step 3: User rejection path**

Click confirm, reject in wallet. Verify:
- Same cancellation UI as pre-migration (not an error screen)
- Dashboard transaction record marked cancelled

- [ ] **Step 4: If any UX regression detected, stop and triage**

If a screen sequence, step ordering, or copy difference is observed: capture the difference, return to Task 5 to adjust `mapTransactionToUpdate` or the wiring, and re-test.

- [ ] **Step 5: Capture decision**

Either confirm "Manual smoke matches pre-migration UX" (proceed) or list deltas to triage (loop back). No commit on this task.

---

## Self-Review

After writing the complete plan, run through this checklist with fresh eyes:

**1. Spec coverage:**
- §3 non-goals → respected (no Spark26 touch, no Kraken branch change, no Redis migration). ✓
- §4 locked decisions → reflected: dashboard mirror retained (Tasks 5 dual-write, Task 6 doesn't remove `use-transaction.ts`/`api/transactions.ts`). ✓
- §5.1 module layout → Tasks 1-7 cover create/refactor/remove. ✓
- §5.2 data flow → Task 3 implements begin, Task 4 implements submit + events, Task 5 wires into payment-widget with dual-write. ✓
- §5.3 status mapping → Task 2 (table-driven tests). ✓
- §6 UI/UX invariants → Task 8 verifies. ✓
- §8 migration sequencing — adjusted to 7 commits (dropped the no-op extension-args fix commit; merged AGENTS.md update). ✓
- §12 acceptance criteria — covered: typecheck/lint/test (Steps 4-6 each task), manual smoke (Task 8), wallet prompts (Task 5 step 6 + Task 8), no LI.FI references (Task 6 step 1 grep + step 6 typecheck), AGENTS.md updated (Task 7), dashboard mirror retained (Task 5 `submitTrackedTransaction` / `cancelTransaction` calls preserved + Task 6 doesn't touch tx mirror files). ✓

**2. Placeholder scan:**
- No "TBD", "fill in", "TODO", "similar to" found.
- Every code step has actual code.
- Every command has expected output.

**3. Type consistency:**
- `BeginCheckoutParams.source` matches `WalletSourceParams` minus `transactionId` ✓
- `SubmitParams.walletAccount` is `WalletAccount` from `@/lib/dynamicClient` ✓
- `mapTransactionToUpdate(transaction, ctx)` signature consistent across Task 2 and Task 4 ✓
- `CheckoutFlowFunctions` interface in Task 5 names exactly the hook's return surface ✓

---

## Execution Handoff

**Plan complete and committed to `docs/projects/checkouts-checkout-flow-migration/PLAN.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for this migration because tasks have clean boundaries and each leaves the app green.

2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Lower context overhead but slower per-task review.

Which approach?
