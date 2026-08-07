"use client";

/**
 * Wallets this session can sign with, and the per-wallet network selection.
 *
 * Thin adapters over the official react-hooks bindings: those subscribe to
 * client state themselves, so they do not race SDK hydration the way a
 * hand-rolled event-driven query does (a fresh load would otherwise cache an
 * empty list before the session restored and show "no wallets" to a signed-in
 * user).
 */

import { useMemo } from "react";
import {
  useGetActiveNetworkData,
  useGetWalletAccounts,
} from "@dynamic-labs-sdk/react-hooks";
import { signableWalletsFor, type NetworkData, type WalletAccount } from "@/lib/dynamic";

/** Every wallet this session holds a share for. */
export function useWalletAccounts() {
  const { data, refetch, isLoading, error } = useGetWalletAccounts();

  return {
    walletAccounts: (data ?? []) as WalletAccount[],
    refetch,
    isLoading,
    error,
  };
}

/** The subset owned by one business account. */
export function useAccountWalletAccounts(businessAccountId: string) {
  const { walletAccounts, refetch, isLoading, error } = useWalletAccounts();

  const signable = useMemo(
    () => signableWalletsFor(walletAccounts, businessAccountId),
    [walletAccounts, businessAccountId],
  );

  return { walletAccounts: signable, refetch, isLoading, error };
}

/**
 * The network a wallet is on.
 *
 * `useGetActiveNetworkData` requires a wallet, so the query is disabled via
 * `queryParams.enabled` when there is none - which is what makes the cast
 * safe.
 */
export function useActiveNetwork(walletAccount: WalletAccount | null) {
  const { data, refetch, isLoading, error } = useGetActiveNetworkData({
    walletAccount: walletAccount as WalletAccount,
    queryParams: { enabled: Boolean(walletAccount) },
  });

  return {
    networkData: data?.networkData as NetworkData | undefined,
    refetch,
    isLoading,
    error,
  };
}
