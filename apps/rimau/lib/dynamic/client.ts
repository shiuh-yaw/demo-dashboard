"use client";

/**
 * Dynamic JS SDK client - singleton, SSR-safe.
 *
 * Only live mode ever calls `getClient()`. The staged backend never imports
 * this module, so a stage laptop without an environment id boots cleanly.
 *
 * @see https://www.dynamic.xyz/docs/javascript/reference/client/create-dynamic-client
 */

import { createDynamicClient, type DynamicClient } from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { addEvmWindowInjectedExtension } from "@dynamic-labs-sdk/evm/window-injected";
import { addZerodevExtension } from "@dynamic-labs-sdk/zerodev";
import {
  createDynamicClientSingleton,
  createAsyncSafeWrapper as packageCreateAsyncSafeWrapper,
  createSafeWrapper as packageCreateSafeWrapper,
} from "@dynamic-demos/dynamic/client-singleton";
import { resolveCredentials } from "@dynamic-demos/dynamic/resolve-credentials";
import { linkStepUpHeaders } from "./step-up";

const singleton = createDynamicClientSingleton<DynamicClient>({
  create: () => {
    const { environmentId } = resolveCredentials();
    return createDynamicClient({
      environmentId,
      autoInitialize: true,
      metadata: { name: "Rimau Exchange" },
      // Step-up: carry the `credential:link` elevated token on the wallet-link
      // request. The SDK mints it but does not attach it there (see step-up.ts).
      coreConfig: { getApiHeaders: linkStepUpHeaders },
    });
  },
  extend: (client) => {
    // EVM only: the wallet is an Ethereum Sepolia wallet, and the sponsored
    // transfer rides ZeroDev's EIP-7702 path (never ERC-4337).
    addEvmExtension(client);
    // Fallback for wallets that only inject `window.ethereum` (older
    // extensions, in-app wallet browsers). EIP-6963 announcements win when
    // a wallet does both.
    addEvmWindowInjectedExtension(client);
    addZerodevExtension(client);
  },
});

export function getClient(): DynamicClient | null {
  return singleton.getClient();
}

export function createSafeWrapper<T>(fn: () => T, fallback: T): () => T {
  return packageCreateSafeWrapper(getClient, fn, fallback);
}

export function createAsyncSafeWrapper<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return packageCreateAsyncSafeWrapper(getClient, fn);
}
