import { describe, expect, it, vi } from "vitest";
import {
  ACCOUNTS_MILESTONES,
  emitOnce,
  hasFiredOnceThisSession,
  markFiredThisSession,
  type AccountsMilestone,
  type MinimalStorage,
} from "../lib/analytics/milestones";

function fakeStorage(): MinimalStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
  };
}

describe("ACCOUNTS_MILESTONES taxonomy", () => {
  it("is exactly the eight documented event names", () => {
    expect(ACCOUNTS_MILESTONES).toEqual([
      "signed_in",
      "authenticated",
      "account_created",
      "account_wallet_created",
      "wallet_transfer_sent",
      "wallet_message_signed",
      "signer_added",
      "member_added",
    ]);
  });

  it("reuses the fleet-wide auth names verbatim so the funnel joins", () => {
    expect(ACCOUNTS_MILESTONES).toContain("signed_in");
    expect(ACCOUNTS_MILESTONES).toContain("authenticated");
  });

  it("type-checks every emitted name against the union", () => {
    const assertMilestone = (name: AccountsMilestone) => name;
    for (const name of ACCOUNTS_MILESTONES) {
      expect(assertMilestone(name)).toBe(name);
    }
    // @ts-expect-error - not part of the taxonomy union
    assertMilestone("bogus_event");
  });
});

describe("session dedupe helpers", () => {
  it("hasFiredOnceThisSession is false until markFiredThisSession runs", () => {
    const storage = fakeStorage();
    expect(hasFiredOnceThisSession("signed_in", storage)).toBe(false);
    markFiredThisSession("signed_in", storage);
    expect(hasFiredOnceThisSession("signed_in", storage)).toBe(true);
  });

  it("tracks each milestone independently", () => {
    const storage = fakeStorage();
    markFiredThisSession("signed_in", storage);
    expect(hasFiredOnceThisSession("account_created", storage)).toBe(false);
  });

  it("emitOnce emits the first time only", () => {
    const storage = fakeStorage();
    const emit = vi.fn();
    emitOnce("signed_in", emit, storage);
    emitOnce("signed_in", emit, storage);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("signed_in");
  });

  it("survives a storage that throws (private-mode restrictions)", () => {
    const throwing: MinimalStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    const emit = vi.fn();
    expect(() => emitOnce("signed_in", emit, throwing)).not.toThrow();
    expect(emit).toHaveBeenCalledTimes(1);
  });
});
