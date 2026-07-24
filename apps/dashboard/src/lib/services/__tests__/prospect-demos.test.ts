/**
 * Pure selection-logic coverage for the DemoConfig unified-binding
 * resolution: isPrimary-then-most-recent per kind, across every kind
 * (not just the legacy earn/checkout/wallet/remittance four).
 */

import { describe, expect, it } from "vitest";

import {
  resolveDemoMap,
  resolveDemoMapBatch,
  type PrimaryCandidate,
} from "../prospect-demos";

function candidate(overrides: Partial<PrimaryCandidate>): PrimaryCandidate {
  return {
    id: "config_1",
    kind: "earn",
    prospectId: "prospect_1",
    isPrimary: false,
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("resolveDemoMap", () => {
  it("picks the isPrimary config even when it is not the most recently updated", () => {
    const primary = candidate({
      id: "config_old_primary",
      isPrimary: true,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const recent = candidate({
      id: "config_new_non_primary",
      isPrimary: false,
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    });
    expect(resolveDemoMap([primary, recent])).toEqual({ earn: "config_old_primary" });
  });

  it("falls back to the most recently updated config when none is primary", () => {
    const older = candidate({
      id: "config_older",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const newer = candidate({
      id: "config_newer",
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    });
    expect(resolveDemoMap([older, newer])).toEqual({ earn: "config_newer" });
  });

  it("resolves every kind independently, including trade/visa-direct/flow", () => {
    const configs = [
      candidate({ id: "earn_1", kind: "earn", isPrimary: true }),
      candidate({ id: "trade_1", kind: "trade", isPrimary: true }),
      candidate({ id: "visa_1", kind: "visa-direct", isPrimary: true }),
      candidate({ id: "flow_1", kind: "flow", isPrimary: true }),
    ];
    expect(resolveDemoMap(configs)).toEqual({
      earn: "earn_1",
      trade: "trade_1",
      "visa-direct": "visa_1",
      flow: "flow_1",
    });
  });

  it("returns an empty map for no candidates", () => {
    expect(resolveDemoMap([])).toEqual({});
  });
});

describe("resolveDemoMapBatch", () => {
  it("groups candidates per prospectId before resolving each kind map", () => {
    const configs = [
      candidate({ id: "a_earn", prospectId: "prospect_a", kind: "earn" }),
      candidate({ id: "b_wallet", prospectId: "prospect_b", kind: "wallet" }),
    ];
    const result = resolveDemoMapBatch(configs);
    expect(result.get("prospect_a")).toEqual({ earn: "a_earn" });
    expect(result.get("prospect_b")).toEqual({ wallet: "b_wallet" });
  });

  it("ignores candidates with no prospectId (unbound demos)", () => {
    const configs = [candidate({ id: "unbound", prospectId: null })];
    expect(resolveDemoMapBatch(configs).size).toBe(0);
  });
});
