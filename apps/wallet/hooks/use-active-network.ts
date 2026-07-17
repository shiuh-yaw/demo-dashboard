"use client";

import { useGetActiveNetworkData } from "@dynamic-labs-sdk/react-hooks";
import type { WalletAccount, NetworkData } from "@/lib/dynamic";

/**
 * Active network for a wallet with reactive updates - adapter over the
 * official react-hooks binding (subscribes to network-switch events
 * itself). Keeps the return shape existing consumers expect.
 *
 * `useGetActiveNetworkData` requires a walletAccount; when none is
 * passed the query is disabled via `queryParams.enabled` so it never
 * runs (the cast is safe under that guard).
 */
export function useActiveNetwork(walletAccount: WalletAccount | null) {
  const { data, refetch, isLoading, error } = useGetActiveNetworkData({
    walletAccount: walletAccount as WalletAccount,
    queryParams: { enabled: !!walletAccount },
  });

  return {
    networkData: data?.networkData as NetworkData | undefined,
    refetch,
    isLoading,
    error,
  };
}
