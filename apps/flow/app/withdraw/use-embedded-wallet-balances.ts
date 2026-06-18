"use client";

/**
 * Embedded-wallet balance fetcher for the withdraw flow.
 *
 * Wraps the SDK's `getBalances` primitive with React state, a
 * cache-bypassing refetch (driven by the Dashboard refresh button),
 * and a stable callback identity so unrelated SDK re-renders don't
 * churn the initial fetch.
 *
 * Pinned to Solana mainnet because the platform embedded wallet is a
 * SOL WaaS account.
 */

import { useCallback, useEffect, useState } from "react";
import { DYNAMIC_SOLANA_NETWORK_ID } from "@dynamic-demos/checkouts-widget";
import { getBalances, type WalletAccount } from "@/lib/dynamic/flow-sdk";

/**
 * Token-balance row as returned by the SDK. Projected from
 * `getBalances`'s public surface via `Awaited<ReturnType>` so any
 * future shape changes surface as compile errors.
 */
type WalletBalance = Awaited<ReturnType<typeof getBalances>>[number];

export function useEmbeddedWalletBalances(walletAccount: WalletAccount) {
  const [tokens, setTokens] = useState<WalletBalance[] | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch balances. Pass `{ force: true }` to bypass Dynamic's
   * server-side balance cache — used by the refresh button so users
   * can see chain state that's newer than the last cache fill.
   */
  const refetch = useCallback(
    async (opts?: { force?: boolean }) => {
      setLoading(true);
      try {
        const balances = await getBalances({
          walletAccount,
          // Pin to Solana mainnet (networkId=101). Without an
          // explicit networkId the SDK falls back to the wallet's
          // "active network", which for a freshly-minted SOL WaaS
          // wallet can race against the network-switch step. Pinning
          // makes the balance fetch deterministic on every call.
          networkId: DYNAMIC_SOLANA_NETWORK_ID,
          includeNative: true,
          includePrices: true,
          filterSpamTokens: true,
          forceRefresh: opts?.force === true,
        });
        setTokens(balances);
      } catch {
        setTokens([]);
      } finally {
        setLoading(false);
      }
    },
    // Narrow to primitive fields so unrelated SDK rehydrations (which
    // produce a new `walletAccount` object identity with the same
    // address) don't churn the callback identity and re-trigger the
    // initial fetch via the dep below. The closure still references
    // `walletAccount` for the SDK call, but only `.address`+`.chain`
    // affect what we fetch — staleness on other fields is harmless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walletAccount.address, walletAccount.chain],
  );

  // Initial fetch (cache-friendly — no `force`).
  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { tokens, loading, refetch };
}
