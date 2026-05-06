"use client";

import {
  createDynamicClient,
  type DynamicClient,
} from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
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
        name: "Deposit Demo",
        universalLink:
          typeof window !== "undefined" ? window.location.origin : "",
      },
    });
  },
  extend: (client) => {
    addEvmExtension(client);
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
