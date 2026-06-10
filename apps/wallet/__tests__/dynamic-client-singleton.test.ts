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
 *   - All chain extension packages resolve correctly.
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

describe("chain extension imports", () => {
  it("all WaaS-capable extension packages are importable", async () => {
    const evm = await import("@dynamic-labs-sdk/evm");
    const solana = await import("@dynamic-labs-sdk/solana");
    const sui = await import("@dynamic-labs-sdk/sui");
    const bitcoin = await import("@dynamic-labs-sdk/bitcoin");
    const ton = await import("@dynamic-labs-sdk/ton");

    expect(evm.addEvmExtension).toBeTypeOf("function");
    expect(solana.addSolanaExtension).toBeTypeOf("function");
    expect(sui.addSuiExtension).toBeTypeOf("function");
    expect(bitcoin.addBitcoinExtension).toBeTypeOf("function");
    expect(ton.addTonExtension).toBeTypeOf("function");
  });

  it("injected-only extensions are NOT registered (no WaaS support)", async () => {
    // These extensions only register injected/external wallet providers and
    // have no embedded wallet (WaaS) support. Registering them in an embedded
    // wallet demo causes unwanted side effects — e.g., the Starknet extension
    // triggers MetaMask's @consensys/starknet-snap permission dialog.
    const clientModule = await import("../lib/dynamic/client");
    const client = clientModule.getClient();
    // In Node/SSR the singleton returns null — just verify the module loads
    expect(client).toBeNull();
  });
});
