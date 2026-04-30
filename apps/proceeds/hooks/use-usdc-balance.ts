"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { subscribePayoutDemo } from "@/lib/payout-demo-store";

interface NetworkInfo {
  chain: string;
  networkId: number;
}

export function useUSDCBalance(
  walletAddress: string | null | undefined,
  network?: NetworkInfo,
) {
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["usdc-balance", walletAddress, network?.networkId],
    queryFn: async (): Promise<number> => {
      if (!walletAddress || !network) return 0;

      const params = new URLSearchParams({
        address: walletAddress,
        networkId: String(network.networkId),
      });

      const res = await fetch(`/api/balance?${params.toString()}`);
      if (!res.ok) return 0;

      const json = (await res.json()) as { balance?: number };
      return json.balance ?? 0;
    },
    enabled: !!walletAddress && !!network,
    refetchInterval: 30_000,
    // Treat chain-keyed balances as always-stale so that switching to a
    // chain you visited recently still refetches. Without this, React-Query
    // returns the cached value silently when you toggle back within the
    // stale window, and the user sees "no balance call fired" even though
    // the active chain changed. The 30s `refetchInterval` still throttles
    // background polling to once per 30 seconds.
    staleTime: 0,
  });

  useEffect(() => {
    return subscribePayoutDemo(() => {
      setTimeout(() => refetch(), 1500);
    });
  }, [refetch]);

  const numericBalance = data ?? 0;

  return {
    raw: numericBalance,
    formatted:
      numericBalance > 0
        ? numericBalance.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) + " USDC"
        : "0.00 USDC",
    usdValue:
      "$" +
      numericBalance.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    symbol: "USDC",
    isLoading,
    isFetching,
    isError,
    refetch,
  };
}
