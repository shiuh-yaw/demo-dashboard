import { describe, expect, it } from "vitest";

import {
  CANONICAL_TRANSACTION_STATES,
  mapAlfredpayStatusToCanonical,
} from "../state-mapping";

describe("mapAlfredpayStatusToCanonical (stub)", () => {
  it("maps `received` and `pending` to canonical `submitted`", () => {
    expect(mapAlfredpayStatusToCanonical("received")).toBe("submitted");
    expect(mapAlfredpayStatusToCanonical("pending")).toBe("submitted");
  });

  it("maps `processing` to canonical `pending`", () => {
    expect(mapAlfredpayStatusToCanonical("processing")).toBe("pending");
  });

  it("maps `completed` to canonical `confirmed`", () => {
    expect(mapAlfredpayStatusToCanonical("completed")).toBe("confirmed");
  });

  it("maps `rejected` and `failed` to canonical `failed`", () => {
    expect(mapAlfredpayStatusToCanonical("rejected")).toBe("failed");
    expect(mapAlfredpayStatusToCanonical("failed")).toBe("failed");
  });

  it("maps `cancelled` and `expired` to their canonical terminals", () => {
    expect(mapAlfredpayStatusToCanonical("cancelled")).toBe("cancelled");
    expect(mapAlfredpayStatusToCanonical("expired")).toBe("expired");
  });

  it("falls back to `pending` for unknown / null / undefined statuses", () => {
    // Per the docstring: never default into a terminal on an unrecognized
    // string — `pending` keeps the txn in a non-terminal state until the
    // next webhook or poll resolves it.
    expect(mapAlfredpayStatusToCanonical("totally_made_up")).toBe("pending");
    expect(mapAlfredpayStatusToCanonical(null)).toBe("pending");
    expect(mapAlfredpayStatusToCanonical(undefined)).toBe("pending");
    expect(mapAlfredpayStatusToCanonical("")).toBe("pending");
  });

  it("emits only states declared in CANONICAL_TRANSACTION_STATES", () => {
    const allowed = new Set<string>(CANONICAL_TRANSACTION_STATES);
    const sampleInputs = [
      "received",
      "pending",
      "processing",
      "completed",
      "rejected",
      "failed",
      "cancelled",
      "expired",
      "unknown",
      "",
      null,
      undefined,
    ];
    for (const input of sampleInputs) {
      const out = mapAlfredpayStatusToCanonical(input as never);
      expect(allowed.has(out)).toBe(true);
    }
  });

  it("documents the canonical state machine ordering matching D-010", () => {
    // Sentinel: this mirror lives here as a stub until packages/transactions
    // (Phase 1E) merges. When 1E lands and re-exports TransactionState, this
    // assertion gets replaced by a re-import equality check.
    expect(CANONICAL_TRANSACTION_STATES).toEqual([
      "initialized",
      "draft",
      "submitted",
      "pending",
      "confirmed",
      "expired",
      "abandoned",
      "failed",
      "cancelled",
    ]);
  });
});
