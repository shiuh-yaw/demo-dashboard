"use client";

import { useGetWalletAccounts } from "@dynamic-labs-sdk/react-hooks";
import type { WalletAccount } from "@/lib/dynamic";

/**
 * Wallet accounts with reactive updates - thin adapter over the
 * official react-hooks binding (which subscribes to client state
 * itself), keeping the return shape existing consumers expect.
 *
 * Replaced the home-grown event-driven query: it raced client
 * hydration on fresh loads (query cached [] before the SDK restored
 * the session, and no later event always fired), showing "No wallets"
 * for signed-in users.
 */
export function useWalletAccounts() {
  const { data, refetch, isLoading, error } = useGetWalletAccounts();

  return {
    walletAccounts: (data ?? []) as WalletAccount[],
    refetch,
    isLoading,
    error,
  };
}
