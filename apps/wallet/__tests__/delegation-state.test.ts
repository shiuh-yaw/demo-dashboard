import { describe, expect, it } from "vitest";

import {
  isIntentSettled,
  resolveDelegationState,
} from "../lib/delegation-state";

const base = {
  delegatedOnDynamic: false,
  isDelegating: false,
  isRevoking: false,
  pending: null,
} as const;

describe("resolveDelegationState", () => {
  it("starts not delegated", () => {
    expect(resolveDelegationState(base)).toBe("not-delegated");
  });

  it("reports delegating while the reshare runs", () => {
    expect(resolveDelegationState({ ...base, isDelegating: true })).toBe(
      "delegating",
    );
  });

  it("is delegated once Dynamic has reshared", () => {
    expect(
      resolveDelegationState({ ...base, delegatedOnDynamic: true }),
    ).toBe("delegated");
  });

  it("shows revoking over every other state", () => {
    expect(
      resolveDelegationState({
        delegatedOnDynamic: true,
        isDelegating: true,
        isRevoking: true,
        pending: null,
      }),
    ).toBe("revoking");
  });

  /**
   * The frame right after `delegateWaasKeyShares` resolves: `isDelegating` has
   * dropped and `refreshUser()` has not repopulated the cache that
   * `hasDelegatedAccess` reads, so both inputs still say false. Falling
   * through to "not-delegated" told the user their grant had failed.
   */
  it("keeps delegating after a grant resolves but before the SDK catches up", () => {
    expect(resolveDelegationState({ ...base, pending: "grant" })).toBe(
      "delegating",
    );
  });

  /** Same frame, the other direction. */
  it("keeps revoking while the SDK still reports access", () => {
    expect(
      resolveDelegationState({
        ...base,
        delegatedOnDynamic: true,
        pending: "revoke",
      }),
    ).toBe("revoking");
  });
});

describe("isIntentSettled", () => {
  it("settles a grant when Dynamic reports access", () => {
    expect(isIntentSettled("grant", true)).toBe(true);
    expect(isIntentSettled("grant", false)).toBe(false);
  });

  it("settles a revoke when Dynamic stops reporting access", () => {
    expect(isIntentSettled("revoke", false)).toBe(true);
    expect(isIntentSettled("revoke", true)).toBe(false);
  });
});
