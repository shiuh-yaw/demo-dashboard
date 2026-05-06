/**
 * Smoke test for the checkouts app's Dynamic singleton wiring.
 *
 * Checkouts has no other characterization tests, so this minimal assertion
 * locks the contract that:
 *   - The app exports a non-empty `environmentId` resolved through the
 *     workspace `resolveCredentials()` chain (D-003).
 *   - The exported SSR-safe wrappers (e.g. `isSignedIn`, `getNetworksData`,
 *     `getPrimaryWalletAccount`) degrade safely on the server — they are the
 *     entry points consumed by widget components on first render before the
 *     browser has had a chance to mount.
 *
 * If these break, a regression in `@dynamic-demos/dynamic/client-singleton`
 * or `resolveCredentials` is the most likely cause.
 */
import { describe, expect, it } from "vitest";

import {
  environmentId,
  isSignedIn,
  getNetworksData,
  getPrimaryWalletAccount,
  getInitStatus,
} from "../lib/dynamicClient";

describe("checkouts dynamic singleton (SSR / Node)", () => {
  it("environmentId resolves to a non-empty string", () => {
    expect(environmentId).toBeTypeOf("string");
    expect(environmentId.length).toBeGreaterThan(0);
  });

  it("isSignedIn() returns false on the server (no client)", () => {
    expect(typeof window).toBe("undefined");
    expect(isSignedIn()).toBe(false);
  });

  it("getNetworksData() returns an empty array on the server", () => {
    expect(getNetworksData()).toEqual([]);
  });

  it("getPrimaryWalletAccount() returns null on the server", () => {
    expect(getPrimaryWalletAccount()).toBeNull();
  });

  it("getInitStatus() reports `uninitialized` on the server", () => {
    expect(getInitStatus()).toBe("uninitialized");
  });
});
