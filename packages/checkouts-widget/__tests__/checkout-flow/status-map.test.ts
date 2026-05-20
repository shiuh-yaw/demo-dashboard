import { describe, it, expect } from "vitest";
import { mapTransactionToUpdate } from "@/checkout-flow/status-map";
import type { CheckoutTransaction } from "@/checkout-flow";

// Stable test fixture builder — enum fields cast via `as any` since we only
// care about the string values at test-time and the real enum maps 1:1.
const tx = (overrides: Partial<Record<string, unknown>> = {}): CheckoutTransaction =>
  ({
    id: "tx_1",
    checkoutId: "ck_1",
    amount: "10.00",
    currency: "USD",
    quoteVersion: 1,
    executionState: "initiated",
    settlementState: "none",
    riskState: "cleared",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as unknown as CheckoutTransaction;

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

  it("source_confirmed/routing → RUNNING step 1 (fall-through to broadcasted-style)", () => {
    const u = mapTransactionToUpdate(
      tx({ executionState: "source_confirmed", settlementState: "routing", txHash: "0xrouted" }),
      { needsConversion: true, totalSteps: 3, isCrossChain: false },
    );
    expect(u).toMatchObject({
      stepIndex: 1,
      status: "RUNNING",
      processType: "SWAP",
      txHash: "0xrouted",
    });
  });

  it("source_confirmed/none → RUNNING step 1 (fall-through to broadcasted-style)", () => {
    const u = mapTransactionToUpdate(
      tx({ executionState: "source_confirmed", settlementState: "none", txHash: "0xnone" }),
      { needsConversion: false, totalSteps: 2, isCrossChain: false },
    );
    expect(u).toMatchObject({
      stepIndex: 1,
      status: "RUNNING",
      processType: "TRANSFER",
      txHash: "0xnone",
    });
  });

  it("quoted → PENDING on step 0", () => {
    const u = mapTransactionToUpdate(tx({ executionState: "quoted" }), {
      needsConversion: false,
      totalSteps: 3,
      isCrossChain: false,
    });
    expect(u).toMatchObject({ stepIndex: 0, status: "PENDING", processType: "TRANSFER" });
  });
});
