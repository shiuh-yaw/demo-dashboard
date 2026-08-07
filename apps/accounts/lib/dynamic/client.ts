"use client";

/**
 * Dynamic SDK client - singleton + SSR-safe wrapper factories.
 *
 * Declares which extensions and credentials this demo wants; the shared
 * `@dynamic-demos/dynamic/client-singleton` factory owns the lazy / SSR /
 * once-per-page guarantees.
 *
 * Business-account wallets are minted through the WaaS provider resolved by
 * chain (`createWalletForBusinessAccount`), so the registered chain extensions
 * are exactly the chains this demo can create accounts on - adding another is
 * one line here plus an entry in `lib/chains.ts`. What the picker actually
 * shows is this set intersected with the environment's enabled networks.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/client/create-dynamic-client
 */

import {
  createDynamicClient,
  type DynamicClient,
} from "@dynamic-labs-sdk/client";
import { addBitcoinExtension } from "@dynamic-labs-sdk/bitcoin";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { addSolanaExtension } from "@dynamic-labs-sdk/solana";
import { addSuiExtension } from "@dynamic-labs-sdk/sui";
import { addTonExtension } from "@dynamic-labs-sdk/ton";
import {
  createDynamicClientSingleton,
  createAsyncSafeWrapper as packageCreateAsyncSafeWrapper,
  createSafeWrapper as packageCreateSafeWrapper,
} from "@dynamic-demos/dynamic/client-singleton";
import { resolveCredentials } from "@dynamic-demos/dynamic/resolve-credentials";

const singleton = createDynamicClientSingleton<DynamicClient>({
  create: () => {
    const { environmentId } = resolveCredentials();
    return createDynamicClient({
      environmentId,
      autoInitialize: true,
      metadata: {
        name: "JS SDK Business Accounts Demo",
      },
    });
  },
  extend: (client) => {
    addEvmExtension(client);
    addSolanaExtension(client);
    addBitcoinExtension(client);
    addSuiExtension(client);
    // Params-first signature, unlike the others; `{}` takes the defaults.
    addTonExtension({}, client);
  },
});

/**
 * Get or create the Dynamic client instance (singleton).
 * Returns null during SSR.
 */
export function getClient(): DynamicClient | null {
  return singleton.getClient();
}

/** SSR-safe wrapper for synchronous SDK functions. */
export function createSafeWrapper<T>(fn: () => T, fallback: T): () => T {
  return packageCreateSafeWrapper(getClient, fn, fallback);
}

/** SSR-safe wrapper for async SDK functions. */
export function createAsyncSafeWrapper<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return packageCreateAsyncSafeWrapper(getClient, fn);
}
