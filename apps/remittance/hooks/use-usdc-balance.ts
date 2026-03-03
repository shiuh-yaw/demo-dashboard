"use client";

import { useSdkQuery } from "./use-sdk-query";
import { getUsdcBalance } from "@/lib/balance/client";

export interface UseUsdcBalanceOptions {
  /** Server-fetched balance for initial render. */
  initialBalance?: number;
}

export function useUsdcBalance(
  walletAddress: string | undefined,
  options?: UseUsdcBalanceOptions,
) {
  const { initialBalance } = options ?? {};
  const { data, isLoading, refetch } = useSdkQuery<number>({
    queryKey: ["usdcBalance", walletAddress],
    queryFn: () => getUsdcBalance(walletAddress!),
    refetchEvent: "walletAccountsChanged",
    enabled: !!walletAddress,
  });

  return {
    balance: data ?? initialBalance ?? 0,
    isLoading: isLoading && initialBalance === undefined,
    refetch,
  };
}
