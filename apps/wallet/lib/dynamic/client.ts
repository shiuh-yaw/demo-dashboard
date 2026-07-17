"use client";

/**
 * Dynamic SDK Client — Singleton & SSR-Safe Wrapper Factories
 *
 * Wires the app-specific extension list and metadata
 * into the shared `@dynamic-demos/dynamic/client-singleton` factory. The
 * package factory owns the lazy / SSR / idempotency guarantees; this module
 * only declares which extensions and credentials this demo wants.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/client/create-dynamic-client
 */

import {
  createDynamicClient,
  type DynamicClient,
} from "@dynamic-labs-sdk/client";

import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { addSolanaExtension } from "@dynamic-labs-sdk/solana";
import { addSuiExtension } from "@dynamic-labs-sdk/sui";
import { addBitcoinExtension } from "@dynamic-labs-sdk/bitcoin";
import { addTonExtension } from "@dynamic-labs-sdk/ton";
import { addZerodevExtension } from "@dynamic-labs-sdk/zerodev";
import {
  createDynamicClientSingleton,
  createAsyncSafeWrapper as packageCreateAsyncSafeWrapper,
  createSafeWrapper as packageCreateSafeWrapper,
} from "@dynamic-demos/dynamic/client-singleton";
import { resolveCredentials } from "@dynamic-demos/dynamic/resolve-credentials";

// =============================================================================
// SINGLETON CLIENT
// =============================================================================

const singleton = createDynamicClientSingleton<DynamicClient>({
  create: () => {
    const { environmentId } = resolveCredentials();
    return createDynamicClient({
      environmentId,
      autoInitialize: true,
      metadata: {
        name: "JS SDK Wallet Demo",
      },
    });
  },
  extend: (client) => {
    addEvmExtension(client);
    addSolanaExtension(client);
    addSuiExtension(client);
    addBitcoinExtension(client);
    // SDK 1.x: addTonExtension takes (params?, client?) - params first.
    addTonExtension(undefined, client);
    addZerodevExtension(client);
  },
});

/**
 * Get or create the Dynamic client instance (singleton).
 *
 * Creates the client on first access and adds all required extensions.
 * Returns null during SSR (server-side rendering).
 */
export function getClient(): DynamicClient | null {
  return singleton.getClient();
}

// =============================================================================
// WRAPPER FACTORIES (back-compat re-exports bound to this app's getClient)
// =============================================================================

/**
 * Creates an SSR-safe wrapper for synchronous SDK functions.
 *
 * Returns the fallback value if running on server, client not initialized,
 * or if the function throws. Re-exported as a per-app helper bound to this
 * app's `getClient` for backwards compatibility.
 */
export function createSafeWrapper<T>(fn: () => T, fallback: T): () => T {
  return packageCreateSafeWrapper(getClient, fn, fallback);
}

/**
 * Creates an SSR-safe wrapper for async SDK functions.
 *
 * Throws "Dynamic client not initialized" when called before client is ready.
 * Re-exported as a per-app helper bound to this app's `getClient`.
 */
export function createAsyncSafeWrapper<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return packageCreateAsyncSafeWrapper(getClient, fn);
}
