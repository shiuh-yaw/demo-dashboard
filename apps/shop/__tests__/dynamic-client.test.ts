/**
 * Smoke test for the shop app's Dynamic SDK initializer wiring.
 *
 * Shop uses an alternative `autoInitialize: false` + explicit
 * `initializeClient()` flow gated by `<DynamicClientProvider>` (a Spinner
 * blocks the tree until the SDK is ready). Migrating it to the lazy
 * `client-singleton` factory was deferred — see
 * `packages/dynamic/AGENTS.md` "Open questions / known gaps".
 *
 * The smaller real consolidation in this app is `resolveCredentials()` for
 * the env-id fallback chain (D-003). This test locks down the surface:
 *   - `initializeDynamicClient` is callable (a function).
 *   - `waitForDynamicClientInitialized` is callable (a function).
 *
 * We deliberately do NOT call `initializeDynamicClient()` in Node — the
 * underlying SDK touches `window` and would throw. The provider component
 * gates the call behind a `useEffect`, which is the right boundary.
 */
import { describe, expect, it } from "vitest";

import {
  initializeDynamicClient,
  waitForDynamicClientInitialized,
} from "../lib/dynamic-client";

describe("shop dynamic client wiring", () => {
  it("exports initializeDynamicClient as a function", () => {
    expect(typeof initializeDynamicClient).toBe("function");
  });

  it("exports waitForDynamicClientInitialized as a function", () => {
    expect(typeof waitForDynamicClientInitialized).toBe("function");
  });
});
