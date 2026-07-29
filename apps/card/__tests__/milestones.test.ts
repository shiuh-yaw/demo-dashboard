import { describe, it, expect, vi } from "vitest";
import {
  CARD_MILESTONES,
  emitOnce,
  hasFiredOnceThisSession,
  markFiredThisSession,
  maybeTrackWalletFunded,
  type MinimalStorage,
  type CardMilestone,
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

describe("CARD_MILESTONES taxonomy", () => {
  it("is exactly the nine documented event names", () => {
    expect(CARD_MILESTONES).toEqual([
      "signed_in",
      "authenticated",
      "card_created",
      "card_viewed",
      "card_details_revealed",
      "wallet_funded",
      "deposit_initiated",
      "deposit_completed",
      "usdc_minted",
    ]);
  });

  it("type-checks every emitted name against the CardMilestone union", () => {
    const assertMilestone = (name: CardMilestone) => name;
    for (const name of CARD_MILESTONES) {
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

  it("tracks each milestone name independently", () => {
    const storage = fakeStorage();
    markFiredThisSession("signed_in", storage);
    expect(hasFiredOnceThisSession("card_viewed", storage)).toBe(false);
  });
});

describe("emitOnce", () => {
  it("fires exactly once per session even when called repeatedly", () => {
    const storage = fakeStorage();
    const emit = vi.fn();
    emitOnce("card_viewed", emit, storage);
    emitOnce("card_viewed", emit, storage);
    emitOnce("card_viewed", emit, storage);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("card_viewed");
  });

  it("does not suppress a different milestone name", () => {
    const storage = fakeStorage();
    const emit = vi.fn();
    emitOnce("signed_in", emit, storage);
    emitOnce("card_viewed", emit, storage);
    expect(emit).toHaveBeenCalledTimes(2);
  });
});

describe("maybeTrackWalletFunded", () => {
  it("emits wallet_funded when the balance is positive", () => {
    const emit = vi.fn();
    maybeTrackWalletFunded(5, emit);
    expect(emit).toHaveBeenCalledWith("wallet_funded");
  });

  it("does not emit when the balance is zero", () => {
    const emit = vi.fn();
    maybeTrackWalletFunded(0, emit);
    expect(emit).not.toHaveBeenCalled();
  });

  it("does not emit for an undefined or NaN balance", () => {
    const emit = vi.fn();
    maybeTrackWalletFunded(undefined, emit);
    maybeTrackWalletFunded(Number.NaN, emit);
    expect(emit).not.toHaveBeenCalled();
  });
});
