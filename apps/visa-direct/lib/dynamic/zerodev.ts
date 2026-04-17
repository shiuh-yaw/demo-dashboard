"use client";

/**
 * ZeroDev (Account Abstraction) bridge.
 *
 * The embedded wallet is already a ZeroDev kernel account — it was
 * provisioned via `createWaasWalletAccounts` in `wallets.ts`. This
 * file exposes the runtime pieces (`sendUserOperation`,
 * `canSponsorUserOperation`, …) behind a lazy loader so the ZeroDev
 * package doesn't execute at module import and block Dynamic's
 * client initialization.
 *
 * Registering the ZeroDev extension is idempotent (the SDK checks
 * internally), but we still memoize the import so repeated send
 * flows don't keep re-running the side-effect.
 */

import { getClient } from "./client";

type ZerodevModule = typeof import("@dynamic-labs-sdk/zerodev");

let cached: Promise<ZerodevModule> | null = null;

/**
 * Dynamically imports `@dynamic-labs-sdk/zerodev`, registers the
 * extension on the Dynamic client, and returns the module. Safe to
 * call on every send — the import is cached and `addZerodevExtension`
 * is idempotent.
 */
export async function ensureZerodev(): Promise<ZerodevModule> {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");

  if (!cached) {
    cached = import("@dynamic-labs-sdk/zerodev").then((mod) => {
      mod.addZerodevExtension(client);
      return mod;
    });
  }
  return cached;
}
