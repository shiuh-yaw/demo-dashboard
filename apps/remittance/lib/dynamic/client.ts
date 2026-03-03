"use client";

/**
 * Dynamic SDK Client — Singleton & SSR-Safe Wrapper Factories
 * EVM-only configuration for remittance app.
 */

import {
  createDynamicClient,
  type DynamicClient,
} from "@dynamic-labs-sdk/client";

import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import { addZerodevExtension } from "@dynamic-labs-sdk/zerodev";

let _client: DynamicClient | null = null;

export function getClient(): DynamicClient | null {
  if (typeof window === "undefined") return null;

  if (!_client) {
    _client = createDynamicClient({
      environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!,
      autoInitialize: true,
      metadata: {
        name: "Remittance Demo",
      },
    });

    addEvmExtension(_client);
    addZerodevExtension(_client);
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
