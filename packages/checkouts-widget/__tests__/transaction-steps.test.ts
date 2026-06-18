import { describe, it, expect } from "vitest";
import {
  generateTransactionSteps,
  updateTransactionSteps,
  type TransactionStep,
  type StepUpdateParams,
} from "@/components/transaction-progress-screen";

// ---------------------------------------------------------------------------
// generateTransactionSteps
// ---------------------------------------------------------------------------

describe("generateTransactionSteps", () => {
  it("same-chain same-symbol transfer: authorize + complete (no approve, no convert)", () => {
    const steps = generateTransactionSteps("deposit", false, "USDC", "USDC");
    expect(steps.map((s) => s.id)).toEqual(["authorize", "complete"]);
    expect(steps.every((s) => s.status === "pending")).toBe(true);
  });

  it("same-chain swap with approval: approve + authorize + convert + complete", () => {
    const steps = generateTransactionSteps("deposit", true, "ETH", "USDC");
    expect(steps.map((s) => s.id)).toEqual([
      "approve",
      "authorize",
      "convert",
      "complete",
    ]);
  });

  it("cross-chain EVM→SOL same-symbol with approval: approve + authorize + complete (no convert)", () => {
    // Base USDC → Solana USDC — same symbol but cross-chain, approval needed
    const steps = generateTransactionSteps("deposit", true, "USDC", "USDC");
    expect(steps.map((s) => s.id)).toEqual(["approve", "authorize", "complete"]);
  });

  it("cross-chain EVM→SOL different-symbol with approval: approve + authorize + convert + complete", () => {
    const steps = generateTransactionSteps("deposit", true, "ETH", "USDC");
    expect(steps.map((s) => s.id)).toEqual([
      "approve",
      "authorize",
      "convert",
      "complete",
    ]);
  });

  it("Solana source (no approval): authorize + complete", () => {
    const steps = generateTransactionSteps("deposit", false, "SOL", "USDC");
    // SOL→USDC has a convert step (different symbols) but no approval
    expect(steps.map((s) => s.id)).toEqual(["authorize", "convert", "complete"]);
  });
});

// ---------------------------------------------------------------------------
// updateTransactionSteps — cross-chain EVM→SOL deposit with approval
// ---------------------------------------------------------------------------

describe("updateTransactionSteps — cross-chain EVM→SOL deposit (Base USDC → Solana USDC)", () => {
  /** Steps for a cross-chain same-symbol deposit with EVM approval. */
  const baseSteps = (): TransactionStep[] =>
    generateTransactionSteps("deposit", true, "USDC", "USDC");

  it("TOKEN_ALLOWANCE ACTION_REQUIRED → approve step becomes active", () => {
    const steps = baseSteps();
    const updated = updateTransactionSteps(steps, {
      processType: "TOKEN_ALLOWANCE",
      status: "ACTION_REQUIRED",
    });
    expect(updated.find((s) => s.id === "approve")?.status).toBe("active");
    expect(updated.find((s) => s.id === "authorize")?.status).toBe("pending");
  });

  it("TOKEN_ALLOWANCE DONE → approve completed, authorize active", () => {
    // Start with approve active (after ACTION_REQUIRED)
    const steps = baseSteps();
    const afterAction = updateTransactionSteps(steps, {
      processType: "TOKEN_ALLOWANCE",
      status: "ACTION_REQUIRED",
    });
    const afterDone = updateTransactionSteps(afterAction, {
      processType: "TOKEN_ALLOWANCE",
      status: "DONE",
    });
    expect(afterDone.find((s) => s.id === "approve")?.status).toBe("completed");
    expect(afterDone.find((s) => s.id === "authorize")?.status).toBe("active");
  });

  it("CROSS_CHAIN ACTION_REQUIRED after approval → authorize stays active", () => {
    const steps = baseSteps();
    let current = updateTransactionSteps(steps, {
      processType: "TOKEN_ALLOWANCE",
      status: "ACTION_REQUIRED",
    });
    current = updateTransactionSteps(current, {
      processType: "TOKEN_ALLOWANCE",
      status: "DONE",
    });
    current = updateTransactionSteps(current, {
      processType: "CROSS_CHAIN",
      status: "ACTION_REQUIRED",
    });
    expect(current.find((s) => s.id === "approve")?.status).toBe("completed");
    expect(current.find((s) => s.id === "authorize")?.status).toBe("active");
    expect(current.find((s) => s.id === "complete")?.status).toBe("pending");
  });

  it("CROSS_CHAIN RUNNING after broadcast → authorize completed, complete active", () => {
    const steps = baseSteps();
    let current = updateTransactionSteps(steps, {
      processType: "TOKEN_ALLOWANCE",
      status: "DONE",
    });
    current = updateTransactionSteps(current, {
      processType: "CROSS_CHAIN",
      status: "RUNNING",
    });
    expect(current.find((s) => s.id === "approve")?.status).toBe("completed");
    expect(current.find((s) => s.id === "authorize")?.status).toBe("completed");
    expect(current.find((s) => s.id === "complete")?.status).toBe("active");
  });

  it("bridging RUNNING → authorize completed, complete active", () => {
    const steps = baseSteps();
    let current = updateTransactionSteps(steps, {
      processType: "TOKEN_ALLOWANCE",
      status: "DONE",
    });
    current = updateTransactionSteps(current, {
      processType: "CROSS_CHAIN",
      status: "RUNNING",
      isBridging: true,
    });
    expect(current.find((s) => s.id === "authorize")?.status).toBe("completed");
    expect(current.find((s) => s.id === "complete")?.status).toBe("active");
  });

  it("RECEIVING DONE → all steps completed", () => {
    const steps = baseSteps();
    let current = updateTransactionSteps(steps, {
      processType: "TOKEN_ALLOWANCE",
      status: "DONE",
    });
    current = updateTransactionSteps(current, {
      processType: "CROSS_CHAIN",
      status: "RUNNING",
      isBridging: true,
    });
    current = updateTransactionSteps(current, {
      processType: "RECEIVING",
      status: "DONE",
    });
    expect(current.every((s) => s.status === "completed")).toBe(true);
  });

  it("FAILED during approval → first active step marked failed", () => {
    const steps = baseSteps();
    let current = updateTransactionSteps(steps, {
      processType: "TOKEN_ALLOWANCE",
      status: "ACTION_REQUIRED",
    });
    current = updateTransactionSteps(current, {
      status: "FAILED",
    });
    expect(current.find((s) => s.id === "approve")?.status).toBe("failed");
    expect(current.find((s) => s.id === "authorize")?.status).toBe("pending");
  });
});

// ---------------------------------------------------------------------------
// updateTransactionSteps — same-chain swap (no cross-chain)
// ---------------------------------------------------------------------------

describe("updateTransactionSteps — same-chain swap with approval (ETH → USDC)", () => {
  const sameChainSteps = (): TransactionStep[] =>
    generateTransactionSteps("payment", true, "ETH", "USDC");

  it("SWAP DONE on same-chain → all steps completed", () => {
    const steps = sameChainSteps();
    let current = updateTransactionSteps(steps, {
      processType: "TOKEN_ALLOWANCE",
      status: "DONE",
    });
    current = updateTransactionSteps(current, {
      processType: "SWAP",
      status: "DONE",
      isCrossChain: false,
    });
    expect(current.every((s) => s.status === "completed")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// updateTransactionSteps — reference stability (no-op returns same ref)
// ---------------------------------------------------------------------------

describe("updateTransactionSteps — reference stability", () => {
  it("returns same reference when update is a no-op", () => {
    const steps = generateTransactionSteps("deposit", false, "USDC", "USDC");
    // Sending an unrelated process type that changes nothing
    const result = updateTransactionSteps(steps, {
      processType: "TOKEN_ALLOWANCE",
      status: "DONE",
    });
    // No approve step — TOKEN_ALLOWANCE DONE with no approve step is a no-op
    expect(result).toBe(steps);
  });
});
