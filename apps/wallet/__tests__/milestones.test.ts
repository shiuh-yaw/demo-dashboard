import { describe, it, expect, vi } from "vitest";
import {
  WALLET_MILESTONES,
  emitOnce,
  hasFiredOnceThisSession,
  markFiredThisSession,
  maybeTrackWalletFunded,
  type MinimalStorage,
  type WalletMilestone,
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

describe("WALLET_MILESTONES taxonomy", () => {
  it("is exactly the eight documented event names", () => {
    expect(WALLET_MILESTONES).toEqual([
      "signed_in",
      "authenticated",
      "wallet_funded",
      "send_initiated",
      "send_completed",
      "backup_completed",
      "receive_viewed",
      "message_signed",
    ]);
  });

  it("type-checks every emitted name against the WalletMilestone union", () => {
    const assertMilestone = (name: WalletMilestone) => name;
    for (const name of WALLET_MILESTONES) {
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
    expect(hasFiredOnceThisSession("wallet_funded", storage)).toBe(false);
  });
});

describe("emitOnce", () => {
  it("fires exactly once per session even when called repeatedly", () => {
    const storage = fakeStorage();
    const emit = vi.fn();
    emitOnce("signed_in", emit, storage);
    emitOnce("signed_in", emit, storage);
    emitOnce("signed_in", emit, storage);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith("signed_in");
  });

  it("does not suppress a different milestone name", () => {
    const storage = fakeStorage();
    const emit = vi.fn();
    emitOnce("signed_in", emit, storage);
    emitOnce("wallet_funded", emit, storage);
    expect(emit).toHaveBeenCalledTimes(2);
  });
});

describe("maybeTrackWalletFunded", () => {
  it("emits wallet_funded when any balance is positive", () => {
    const emit = vi.fn();
    maybeTrackWalletFunded([{ balance: 0 }, { balance: 5 }], emit);
    expect(emit).toHaveBeenCalledWith("wallet_funded");
  });

  it("does not emit when every balance is zero", () => {
    const emit = vi.fn();
    maybeTrackWalletFunded([{ balance: 0 }, { balance: 0 }], emit);
    expect(emit).not.toHaveBeenCalled();
  });

  it("does not emit for an empty balance list", () => {
    const emit = vi.fn();
    maybeTrackWalletFunded([], emit);
    expect(emit).not.toHaveBeenCalled();
  });
});
