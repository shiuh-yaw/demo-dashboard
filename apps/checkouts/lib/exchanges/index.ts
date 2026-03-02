/**
 * Exchange Registry
 *
 * Central registry of all supported exchange adapters.
 * New exchanges (Coinbase, Crypto.com, etc.) can be added
 * by creating an adapter and registering it here.
 *
 * @module lib/exchanges
 */

export { krakenAdapter } from "./kraken";
export type {
  ExchangeProvider,
  ExchangeAdapter,
  ExchangeTransferParams,
  ExchangeTransferResult,
  WhitelistCheckResult,
  ExchangeWhitelistData,
  ExchangeWhitelistDestination,
} from "./types";
export {
  saveExchangeRedirectState,
  consumeExchangeRedirectState,
  hasPendingExchangeRedirect,
  type ExchangeRedirectState,
} from "./redirect-state";

import { krakenAdapter } from "./kraken";
import type { ExchangeAdapter } from "./types";
import { getUserSocialAccounts } from "@/lib/dynamicClient";

/** All supported exchange adapters */
export const EXCHANGES: ExchangeAdapter[] = [krakenAdapter];

/**
 * Find an exchange adapter by key.
 * @param key - Exchange key (e.g., "kraken")
 * @returns The exchange adapter or undefined if not found
 */
export function getExchangeAdapter(key: string): ExchangeAdapter | undefined {
  return EXCHANGES.find((e) => e.key === key);
}

/**
 * Resolve the active exchange key.
 * Uses the explicit key if provided, otherwise discovers from connected social accounts.
 *
 * @param explicitKey - Explicitly set exchange key (e.g., from state)
 * @returns Exchange key or null if none found
 */
export function resolveActiveExchangeKey(
  explicitKey?: string | null,
): string | null {
  if (explicitKey) return explicitKey;
  const socialAccounts = getUserSocialAccounts();
  return (
    EXCHANGES.find((e) =>
      socialAccounts.some((a) => a.provider === e.socialProvider),
    )?.key ?? null
  );
}

/**
 * Resolve the active exchange adapter and key in one call.
 * Use when you need both to execute exchange logic (e.g. whitelist check, createTransfer).
 *
 * @param activeExchangeKey - Explicit exchange key or null to resolve from connected accounts
 * @returns Adapter and key, or null if none active
 */
export function getActiveExchangeAdapter(activeExchangeKey?: string | null): {
  adapter: ExchangeAdapter;
  key: string;
} | null {
  const key = resolveActiveExchangeKey(activeExchangeKey);
  if (!key) return null;
  const adapter = getExchangeAdapter(key);
  return adapter ? { adapter, key } : null;
}
