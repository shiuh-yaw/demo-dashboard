"use client";

import {
  createDynamicClient,
  type DynamicClient,
} from "@dynamic-labs-sdk/client";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { env } from "@/lib/env";

let _client: DynamicClient | null = null;

export function getClient(): DynamicClient | null {
  if (typeof window === "undefined") return null;

  if (!_client) {
    _client = createDynamicClient({
      environmentId: env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
      autoInitialize: true,
      metadata: {
        name: "Proceeds Developer Payouts",
      },
    });

    addEvmExtension(_client);

    // Eagerly load ZeroDev in the background so getSmartWalletAccount()
    // returns the kernel account address as soon as possible.
    import("@dynamic-labs-sdk/zerodev")
      .then(({ addZerodevExtension }) => addZerodevExtension(_client!))
      .catch(() => {});
  }

  return _client;
}

export function createSafeWrapper<T>(fn: () => T, fallback: T): () => T {
  return () => {
    const client = getClient();
    if (!client) return fallback;
    try {
      return fn();
    } catch {
      return fallback;
    }
  };
}

export function createAsyncSafeWrapper<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    const client = getClient();
    if (!client) throw new Error("Dynamic client not initialized");
    return fn(...args);
  };
}
