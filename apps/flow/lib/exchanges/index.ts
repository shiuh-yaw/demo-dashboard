/**
 * Exchange Registry
 *
 * Central registry of all supported exchange adapters for the Flow app.
 * New exchanges (Coinbase, Crypto.com, etc.) can be added by creating
 * an adapter and registering it here.
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
  exchangeOAuthReturnUrl,
  type ExchangeRedirectState,
} from "./redirect-state";

import { krakenAdapter } from "./kraken";
import type { ExchangeAdapter } from "./types";
import { getUserSocialAccounts } from "@/lib/dynamic/flow-sdk";

/** All supported exchange adapters */
export const EXCHANGES: ExchangeAdapter[] = [krakenAdapter];

export function getExchangeAdapter(key: string): ExchangeAdapter | undefined {
  return EXCHANGES.find((e) => e.key === key);
}

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

export function getActiveExchangeAdapter(activeExchangeKey?: string | null): {
  adapter: ExchangeAdapter;
  key: string;
} | null {
  const key = resolveActiveExchangeKey(activeExchangeKey);
  if (!key) return null;
  const adapter = getExchangeAdapter(key);
  return adapter ? { adapter, key } : null;
}
