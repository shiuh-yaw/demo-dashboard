/**
 * Tests for the LI.FI status → canonical state mapping.
 *
 * The mapping is intentionally narrow (LI.FI's status enum is coarse).
 * These tests pin the contract so Phase 1E can swap the placeholder
 * `CanonicalLifiState` for the real `TransactionState` enum without
 * silently changing behaviour.
 */

import { describe, expect, it } from "vitest";
import { mapLifiStatus, mapLifiStatusResult } from "./state-mapping";
import type { LifiStatusResult, LifiStatusValue } from "./types";

describe("mapLifiStatus", () => {
  const cases: Array<[LifiStatusValue, ReturnType<typeof mapLifiStatus>]> = [
    ["DONE", "confirmed"],
    ["FAILED", "failed"],
    ["NOT_FOUND", "not_found"],
    ["PENDING", "pending"],
  ];

  for (const [upstream, canonical] of cases) {
    it(`${upstream} → ${canonical}`, () => {
      expect(mapLifiStatus(upstream)).toBe(canonical);
    });
  }
});

describe("mapLifiStatusResult", () => {
  it("maps a full status result by its top-level status", () => {
    const result: LifiStatusResult = {
      status: "DONE",
      lifiExplorerLink: "https://example.test/tx",
    };
    expect(mapLifiStatusResult(result)).toBe("confirmed");
  });
});
