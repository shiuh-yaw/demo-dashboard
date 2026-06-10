/**
 * Exchange OAuth redirect state tests.
 *
 * Covers:
 * - saveExchangeRedirectState writes to sessionStorage
 * - consumeExchangeRedirectState reads + removes from sessionStorage
 * - hasPendingExchangeRedirect checks existence
 * - Graceful degradation when sessionStorage is unavailable
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  saveExchangeRedirectState,
  consumeExchangeRedirectState,
  hasPendingExchangeRedirect,
  type ExchangeRedirectState,
} from "../lib/exchanges/redirect-state";

const STORAGE_KEY = "exchange_oauth_redirect";

// Minimal sessionStorage stub for Node environment.
function createSessionStorageStub() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
  };
}

describe("exchange redirect state", () => {
  let storage: ReturnType<typeof createSessionStorageStub>;

  beforeEach(() => {
    storage = createSessionStorageStub();
    // @ts-expect-error -- minimal sessionStorage shim
    globalThis.sessionStorage = storage;
  });

  afterEach(() => {
    // @ts-expect-error -- cleanup
    delete globalThis.sessionStorage;
  });

  // ---------------------------------------------------------------------------
  // saveExchangeRedirectState
  // ---------------------------------------------------------------------------

  it("saves state to sessionStorage", () => {
    const state: ExchangeRedirectState = {
      exchangeKey: "kraken",
      depositAmount: 42,
    };
    saveExchangeRedirectState(state);
    expect(storage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(state),
    );
  });

  // ---------------------------------------------------------------------------
  // consumeExchangeRedirectState
  // ---------------------------------------------------------------------------

  it("returns the stored state and removes it", () => {
    const state: ExchangeRedirectState = {
      exchangeKey: "kraken",
      depositAmount: 100,
    };
    saveExchangeRedirectState(state);

    const result = consumeExchangeRedirectState();
    expect(result).toEqual(state);
    expect(storage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it("returns null when no state is stored", () => {
    expect(consumeExchangeRedirectState()).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // hasPendingExchangeRedirect
  // ---------------------------------------------------------------------------

  it("returns true when state exists", () => {
    saveExchangeRedirectState({ exchangeKey: "kraken", depositAmount: 0 });
    expect(hasPendingExchangeRedirect()).toBe(true);
  });

  it("returns false when no state exists", () => {
    expect(hasPendingExchangeRedirect()).toBe(false);
  });

  it("returns false after state is consumed", () => {
    saveExchangeRedirectState({ exchangeKey: "kraken", depositAmount: 50 });
    consumeExchangeRedirectState();
    expect(hasPendingExchangeRedirect()).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Graceful degradation
  // ---------------------------------------------------------------------------

  it("save does not throw when sessionStorage is unavailable", () => {
    // @ts-expect-error -- remove sessionStorage
    delete globalThis.sessionStorage;
    expect(() =>
      saveExchangeRedirectState({ exchangeKey: "kraken", depositAmount: 0 }),
    ).not.toThrow();
  });

  it("consume returns null when sessionStorage is unavailable", () => {
    // @ts-expect-error -- remove sessionStorage
    delete globalThis.sessionStorage;
    expect(consumeExchangeRedirectState()).toBeNull();
  });

  it("hasPending returns false when sessionStorage is unavailable", () => {
    // @ts-expect-error -- remove sessionStorage
    delete globalThis.sessionStorage;
    expect(hasPendingExchangeRedirect()).toBe(false);
  });
});
