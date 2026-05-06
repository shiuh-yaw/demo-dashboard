/**
 * Tests for createDynamicClientSingleton + createSafeWrapper helpers.
 *
 * These primitives encapsulate boilerplate that was previously duplicated
 * char-for-char across apps/wallet, apps/deposit, apps/proceeds. The contract
 * we lock down here:
 *
 *   - Lazy creation: `create()` is not invoked until `getClient()` is called.
 *   - Idempotency: repeated `getClient()` returns the same instance and only
 *     calls `create()`/`extend()` once per page.
 *   - SSR safety: when `window` is undefined (Node test env), `getClient()`
 *     returns null and never calls `create()`.
 *   - Wrapper guards: safe wrappers degrade to fallback on missing client or
 *     thrown SDK errors; async wrappers throw a stable error message.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAsyncSafeWrapper,
  createDynamicClientSingleton,
  createSafeWrapper,
} from "../clientSingleton";

// jsdom-like global to make `typeof window !== "undefined"` evaluate true.
// We restore the original after each test to avoid leaking state between
// suites that legitimately want SSR semantics.
const stubWindow = (): void => {
  (globalThis as { window?: object }).window = {} as object;
};
const removeWindow = (): void => {
  delete (globalThis as { window?: object }).window;
};

describe("createDynamicClientSingleton", () => {
  afterEach(() => {
    removeWindow();
  });

  it("returns null on the server (no window)", () => {
    const create = vi.fn(() => ({ kind: "stub" }));
    const { getClient } = createDynamicClientSingleton({ create });
    expect(getClient()).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("creates exactly one instance across repeated calls in the browser", () => {
    stubWindow();
    const create = vi.fn(() => ({ kind: "stub" }));
    const extend = vi.fn();
    const { getClient } = createDynamicClientSingleton({ create, extend });

    const a = getClient();
    const b = getClient();
    const c = getClient();

    expect(a).toBeTruthy();
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(create).toHaveBeenCalledTimes(1);
    expect(extend).toHaveBeenCalledTimes(1);
    expect(extend).toHaveBeenCalledWith(a);
  });

  it("does not require the extend hook", () => {
    stubWindow();
    const create = vi.fn(() => ({ kind: "minimal" }));
    const { getClient } = createDynamicClientSingleton({ create });

    expect(getClient()).toEqual({ kind: "minimal" });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("__resetForTests recreates on next call (test-only)", () => {
    stubWindow();
    let counter = 0;
    const { getClient, __resetForTests } = createDynamicClientSingleton({
      create: () => ({ id: ++counter }),
    });

    expect(getClient()).toEqual({ id: 1 });
    expect(getClient()).toEqual({ id: 1 });
    __resetForTests();
    expect(getClient()).toEqual({ id: 2 });
  });
});

describe("createSafeWrapper", () => {
  beforeEach(() => removeWindow());

  it("returns the fallback when getClient returns null", () => {
    const wrapped = createSafeWrapper(
      () => null,
      () => "live",
      "fallback",
    );
    expect(wrapped()).toBe("fallback");
  });

  it("invokes the underlying fn when client is available", () => {
    const wrapped = createSafeWrapper(
      () => ({}),
      () => "live",
      "fallback",
    );
    expect(wrapped()).toBe("live");
  });

  it("returns the fallback when fn throws", () => {
    const wrapped = createSafeWrapper(
      () => ({}),
      () => {
        throw new Error("boom");
      },
      "fallback",
    );
    expect(wrapped()).toBe("fallback");
  });
});

describe("createAsyncSafeWrapper", () => {
  it("rejects with the canonical message when client is missing", async () => {
    const wrapped = createAsyncSafeWrapper(
      () => null,
      async (x: number) => x + 1,
    );
    await expect(wrapped(1)).rejects.toThrow(/not initialized/i);
  });

  it("forwards args + result when client is available", async () => {
    const wrapped = createAsyncSafeWrapper(
      () => ({}),
      async (x: number, y: number) => x + y,
    );
    await expect(wrapped(2, 3)).resolves.toBe(5);
  });

  it("propagates SDK errors (does not swallow)", async () => {
    const wrapped = createAsyncSafeWrapper(
      () => ({}),
      async () => {
        throw new Error("network down");
      },
    );
    await expect(wrapped()).rejects.toThrow("network down");
  });
});
