"use client";

/**
 * RUSDC wallet balance read (Gap 2). Wraps `readRusdcBalance` in react-query
 * so `wallet-balance-display.tsx` can show "available to fund" alongside a
 * refresh control. Query key starts with `"rusdc"` so `useFaucet`'s
 * post-mint `queryClient.invalidateQueries({ queryKey: ["rusdc"] })` picks
 * this query up too.
 */

import { useQuery } from "@tanstack/react-query";
import { readRusdcBalance } from "@/lib/balances/rusdc-balance";
import { useBalancePollInterval } from "@/contexts/balance-watch-context";

export interface UseRusdcBalanceResult {
  raw: bigint | undefined;
  formatted: string | undefined;
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useRusdcBalance(address: string | undefined): UseRusdcBalanceResult {
  const refetchInterval = useBalancePollInterval();
  const query = useQuery({
    queryKey: ["rusdc", address],
    queryFn: () => readRusdcBalance(address as string),
    enabled: !!address,
    // Fetch on mount, then poll only inside the post-action window (a mint or
    // fund opens it) - the wallet balance only changes when the user acts.
    // staleTime 0 so each invalidate/poll reads fresh (overrides the 60s
    // QueryClient default).
    refetchInterval,
    staleTime: 0,
    retry: false,
  });
  return {
    raw: query.data?.raw,
    formatted: query.data?.formatted,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}
