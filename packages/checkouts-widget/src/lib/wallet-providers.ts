/**
 * Wallet provider helpers.
 *
 * The Dynamic SDK's `getAvailableWalletProvidersData()` returns one
 * entry per (wallet × chain) pair — MetaMask shows up as MetaMask EVM,
 * Phantom shows up as Phantom EVM AND Phantom Solana, etc. Hosts almost
 * always want to render one row per wallet brand, so `groupProviders`
 * collapses those entries by `groupKey` (with a regex fallback for
 * providers that don't set one).
 */

import type { WalletProviderData } from "@dynamic-labs-sdk/client";

/**
 * One row per wallet brand. `providers` retains all per-chain entries so
 * callers can pick the right one (e.g., prefer EVM when the target
 * payment Flow targets EVM).
 */
export interface WalletGroup {
  /** Stable identifier across chains for the same brand. */
  key: string;
  displayName: string;
  icon?: string;
  /** All per-chain `WalletProviderData` entries for this brand. */
  providers: WalletProviderData[];
}

/**
 * Group raw `WalletProviderData[]` into one entry per wallet brand.
 *
 * Uses each provider's `groupKey` when present; otherwise strips a
 * trailing `evm` / `sol` suffix from the `key` so MetaMask EVM, Phantom
 * EVM, Phantom SOL group together by brand even when `groupKey` is
 * unset.
 */
export function groupProviders(providers: WalletProviderData[]): WalletGroup[] {
  const groups = providers.reduce<Record<string, WalletGroup>>(
    (acc, provider) => {
      const groupKey =
        provider.groupKey || provider.key.replace(/evm$|sol$/, "");
      if (!acc[groupKey]) {
        acc[groupKey] = {
          key: groupKey,
          displayName: provider.metadata?.displayName || groupKey,
          icon: provider.metadata?.icon,
          providers: [],
        };
      }
      acc[groupKey].providers.push(provider);
      return acc;
    },
    {},
  );
  return Object.values(groups);
}
