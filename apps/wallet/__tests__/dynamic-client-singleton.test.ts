/**
 * Smoke test for the wallet app's Dynamic SDK singleton wiring.
 *
 * Wallet has no other characterization tests, so this minimal assertion
 * locks the contract that:
 *   - The package's `client-singleton` factory is wired into the app's
 *     `getClient` (returns null in a Node environment).
 *   - The app's `createSafeWrapper` returns its fallback value on the server.
 *   - The app's `createAsyncSafeWrapper` rejects with the canonical message
 *     when no client exists.
 *
 * If these break in the future the cause is almost certainly a regression in
 * `@dynamic-demos/dynamic/client-singleton` rather than wallet itself, which
 * is exactly the class of failure we want to surface here rather than letting
 * it silently break the app at runtime.
 */
import { describe, expect, it } from "vitest";

import {
  createAsyncSafeWrapper,
  createSafeWrapper,
  getClient,
} from "../lib/dynamic/client";

describe("wallet dynamic singleton (SSR / Node)", () => {
  it("getClient() returns null when window is undefined", () => {
    expect(typeof window).toBe("undefined");
    expect(getClient()).toBeNull();
  });

  it("createSafeWrapper returns the fallback when no client is available", () => {
    const wrapped = createSafeWrapper(() => "live", "fallback");
    expect(wrapped()).toBe("fallback");
  });

  it("createAsyncSafeWrapper rejects when no client is available", async () => {
    const wrapped = createAsyncSafeWrapper(async () => "live");
    await expect(wrapped()).rejects.toThrow(/not initialized/i);
  });
});
