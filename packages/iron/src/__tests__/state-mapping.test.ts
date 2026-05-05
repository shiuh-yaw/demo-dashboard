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
    expect(ironAutorampStatusToCanonical("Created")).toBe("pending");
    expect(ironAutorampStatusToCanonical("EditPending")).toBe("pending");
    expect(ironAutorampStatusToCanonical("Authorized")).toBe("submitted");
    expect(ironAutorampStatusToCanonical("DepositAccountAdded")).toBe(
      "submitted",
    );
    expect(ironAutorampStatusToCanonical("Approved")).toBe("confirmed");
    expect(ironAutorampStatusToCanonical("Rejected")).toBe("failed");
    expect(ironAutorampStatusToCanonical("Cancelled")).toBe("cancelled");
  });

  it("falls back to pending for unknown statuses", () => {
    expect(ironAutorampStatusToCanonical("Quantum")).toBe("pending");
    expect(ironAutorampStatusToCanonical("")).toBe("pending");
  });
});
