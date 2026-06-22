/**
 * Contract tests for state-mapping.
 *
 * Pinning these mappings prevents silent drift when canonical
 * TransactionState lands in `@dynamic-demos/transactions` (Phase 1E).
 */
import { describe, it, expect } from "vitest";
import {
  rampStatusToCanonical,
  ironAutorampStatusToCanonical,
  ironTransactionStatusToCanonical,
} from "../state-mapping";
import type { RampStatus } from "../types";

describe("rampStatusToCanonical", () => {
  const cases: Array<[RampStatus, ReturnType<typeof rampStatusToCanonical>]> = [
    ["pending", "pending"],
    ["processing", "submitted"],
    ["completed", "confirmed"],
    ["failed", "failed"],
    ["cancelled", "cancelled"],
  ];

  it.each(cases)("maps %s -> %s", (input, expected) => {
    expect(rampStatusToCanonical(input)).toBe(expected);
  });
});

describe("ironAutorampStatusToCanonical", () => {
  it("maps known Iron autoramp statuses", () => {
    expect(ironAutorampStatusToCanonical("Created")).toBe("initialized");
    expect(ironAutorampStatusToCanonical("EditPending")).toBe("initialized");
    expect(ironAutorampStatusToCanonical("Authorized")).toBe("pending");
    expect(ironAutorampStatusToCanonical("DepositAccountAdded")).toBe(
      "pending",
    );
    expect(ironAutorampStatusToCanonical("Approved")).toBe("submitted");
    expect(ironAutorampStatusToCanonical("Rejected")).toBe("failed");
    expect(ironAutorampStatusToCanonical("Cancelled")).toBe("cancelled");
  });

  it("falls back to pending for unknown statuses", () => {
    expect(ironAutorampStatusToCanonical("Quantum")).toBe("pending");
    expect(ironAutorampStatusToCanonical("")).toBe("pending");
  });
});

describe("ironTransactionStatusToCanonical", () => {
  it("maps known Iron transaction statuses", () => {
    expect(ironTransactionStatusToCanonical("FundsReviewInProgress")).toBe(
      "pending",
    );
    expect(ironTransactionStatusToCanonical("ConversionInProgress")).toBe(
      "submitted",
    );
    expect(ironTransactionStatusToCanonical("PayoutInProgress")).toBe(
      "submitted",
    );
    expect(ironTransactionStatusToCanonical("Completed")).toBe("confirmed");
    expect(ironTransactionStatusToCanonical("Failed")).toBe("failed");
    expect(ironTransactionStatusToCanonical("RejectedAml")).toBe("failed");
    expect(ironTransactionStatusToCanonical("RejectedFraud")).toBe("failed");
    expect(ironTransactionStatusToCanonical("RejectedMinAmount")).toBe(
      "failed",
    );
  });

  it("falls back to pending for unknown statuses", () => {
    expect(ironTransactionStatusToCanonical("Unknown")).toBe("pending");
    expect(ironTransactionStatusToCanonical("")).toBe("pending");
  });
});
