"use client";

import { useEffect } from "react";
import { useSdkQuery } from "./use-sdk-query";
import {
  getActiveNetworkData,
  type WalletAccount,
} from "@/lib/dynamic";

/**
 * Hook to get active network for a wallet with reactive updates.
 */
export function useActiveNetwork(walletAccount: WalletAccount | null) {
  const { data, refetch, isLoading, error } = useSdkQuery<{
    networkData: Awaited<ReturnType<typeof getActiveNetworkData>>["networkData"];
  }>({
    queryKey: ["activeNetwork", walletAccount?.id],
    queryFn: () =>
      walletAccount
        ? getActiveNetworkData({ walletAccount })
        : Promise.resolve({ networkData: undefined }),
    refetchEvent: "walletProviderChanged",
    eventFilter: (payload) =>
      (payload as { walletProviderKey?: string })?.walletProviderKey ===
      walletAccount?.walletProviderKey,
    enabled: !!walletAccount,
  });

  const networkData = data?.networkData;
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[useActiveNetwork]", {
        walletId: walletAccount?.id,
        walletChain: walletAccount?.chain,
        walletAddress: walletAccount?.address?.slice(0, 10) + "...",
        networkData: networkData
          ? { networkId: networkData.networkId, displayName: networkData.displayName ?? (networkData as { name?: string }).name ?? networkData.chain }
          : null,
        isLoading,
        error: error?.message,
      });
    }
  }, [walletAccount?.id, walletAccount?.chain, walletAccount?.address, networkData, isLoading, error]);

  return {
    networkData,
    refetch,
    isLoading,
    error,
  };
}
