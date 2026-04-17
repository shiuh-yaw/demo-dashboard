"use client";

/**
 * Dynamic SDK Client — Singleton & SSR-Safe Wrapper Factories
 * EVM-only configuration for Visa Direct demo.
 *
 * The EVM extension is registered eagerly so `getWalletAccounts()`
 * returns EVM entries immediately. ZeroDev is loaded via dynamic
 * import (keeps the critical-path bundle lighter) but still kicked
 * off right at client creation — the SDK only surfaces the kernel
 * (smart-wallet) account once the ZeroDev extension is registered,
 * and every send flow downstream needs that account to exist on
 * cold reloads without waiting for the user to open the create
 * wallet modal first.
 */

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
        name: "Airbnb Host Portal",
        // SIWE message builder (invoked by
        // `connectAndVerifyWithWalletProvider`) derives the signing
        // domain from this URL. Leaving it unset throws "Universal
        // link is not set" as soon as the user picks an external
        // wallet. `window.location.origin` is safe here because
        // `getClient()` short-circuits on the server.
        universalLink: window.location.origin,
      },
    });

    addEvmExtension(_client);

    // Register ZeroDev asynchronously so the kernel wallet account
    // shows up in `getWalletAccounts()` on cold reloads, without
    // blocking the initial bundle on ZeroDev's deps.
    void import("@dynamic-labs-sdk/zerodev")
      .then((mod) => {
        if (_client) mod.addZerodevExtension(_client);
      })
      .catch(() => {
        // If the ZeroDev extension fails to load we degrade to
        // EOA-only flows — surfaced later by send-usdc when it can't
        // find a kernel account.
      });
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
