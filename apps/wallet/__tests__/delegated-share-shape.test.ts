import { describe, expect, it } from "vitest";

import { isDelegatedShareShape } from "../lib/dynamic/delegation";

/**
 * Lifted from a live session JWT for a delegated V3 wallet. The delegation is
 * in `otherShareSets`; `keyShares` says only "dynamic". Dynamic's dashboard
 * showed this wallet Active while the SDK's own `hasDelegatedAccess` - which
 * reads `keyShares[].backupLocation` alone - reported false.
 */
const V3_DELEGATED = {
  keyShares: [{ backupLocation: "dynamic" }],
  otherShareSets: [{ shareSetType: "delegated" }],
};

const V3_NOT_DELEGATED = {
  keyShares: [{ backupLocation: "dynamic" }],
  otherShareSets: [],
};

const LEGACY_DELEGATED = {
  keyShares: [{ backupLocation: "dynamic" }, { backupLocation: "delegated" }],
};

describe("isDelegatedShareShape", () => {
  it("sees a V3 delegation in otherShareSets", () => {
    expect(isDelegatedShareShape(V3_DELEGATED)).toBe(true);
  });

  it("still sees the legacy keyShares shape", () => {
    expect(isDelegatedShareShape(LEGACY_DELEGATED)).toBe(true);
  });

  it("does not report an undelegated V3 wallet", () => {
    expect(isDelegatedShareShape(V3_NOT_DELEGATED)).toBe(false);
  });

  it("treats a non-delegated share set as not delegated", () => {
    expect(
      isDelegatedShareShape({ otherShareSets: [{ shareSetType: "rootUser" }] }),
    ).toBe(false);
  });

  it("handles absent properties", () => {
    expect(isDelegatedShareShape(undefined)).toBe(false);
    expect(isDelegatedShareShape(null)).toBe(false);
    expect(isDelegatedShareShape({})).toBe(false);
  });
});
