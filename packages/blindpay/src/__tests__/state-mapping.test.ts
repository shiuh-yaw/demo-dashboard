/**
 * Stub state-mapping behavior — the real `TransactionState` enum lands in
 * Phase 1E (`packages/transactions`). Until then this test pins the
 * placeholder mapping so future refactors don't silently break consumers.
 */

import { describe, expect, it } from "vitest";

import {
  CanonicalTransactionStatePlaceholder,
  mapBlindpayStatus,
} from "../state-mapping";

describe("mapBlindpayStatus (placeholder)", () => {
  it.each([
    ["pending", CanonicalTransactionStatePlaceholder.pending],
    ["processing", CanonicalTransactionStatePlaceholder.submitted],
    ["in_progress", CanonicalTransactionStatePlaceholder.submitted],
    ["completed", CanonicalTransactionStatePlaceholder.confirmed],
    ["cancelled", CanonicalTransactionStatePlaceholder.cancelled],
    ["expired", CanonicalTransactionStatePlaceholder.expired],
    ["failed", CanonicalTransactionStatePlaceholder.failed],
  ])("maps `%s` -> `%s`", (input, expected) => {
    expect(mapBlindpayStatus(input)).toBe(expected);
  });

  it("falls through unknown statuses to `failed` rather than throwing", () => {
    expect(mapBlindpayStatus("definitely-not-a-status")).toBe(
      CanonicalTransactionStatePlaceholder.failed,
    );
  });
});
