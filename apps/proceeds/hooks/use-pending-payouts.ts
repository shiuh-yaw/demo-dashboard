"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { subscribePayoutDemo } from "@/lib/payout-demo-store";
import type {
  PendingPayoutRecord,
  PendingPayoutsResult,
} from "@/lib/fireblocks-pending";

/**
 * Polls the Fireblocks Orders API (via `/api/payout/pending`) for in-flight
 * payouts targeting the connected wallet. Returns a list of pending orders
 * — orders that have been submitted but haven't yet settled on-chain.
 *
 * Pending orders are chain-agnostic on the Fireblocks side: the API scopes
 * by destination wallet address, not chain id. Once an order completes,
 * Alchemy picks up the on-chain transfer via `useTransactionHistory` and
 * Fireblocks moves the order to a terminal state — so it falls out of this
 * list automatically.
 */
export function usePendingPayouts(walletAddress: string | null | undefined) {
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["pending-payouts", walletAddress],
    queryFn: async (): Promise<PendingPayoutsResult> => {
      if (!walletAddress) return { orders: [], source: "live" };

      const params = new URLSearchParams({ address: walletAddress });
      const res = await fetch(`/api/payout/pending?${params.toString()}`);
      if (!res.ok) return { orders: [], source: "mock" };

      return (await res.json()) as PendingPayoutsResult;
    },
    enabled: !!walletAddress,
    // Pending payouts can transition to terminal in seconds (Polygon is
    // fast). Poll often enough that the user sees the row disappear and
    // its on-chain counterpart appear without a manual refresh.
    refetchInterval: 15_000,
    staleTime: 0,
  });

  // When the demo store records a new payout (from `payout-modal`), kick
  // a refetch shortly after so the freshly-submitted Fireblocks order
  // surfaces in the pending list right away.
  useEffect(() => {
    return subscribePayoutDemo(() => {
      setTimeout(() => refetch(), 800);
    });
  }, [refetch]);

  const orders: PendingPayoutRecord[] = data?.orders ?? [];

  return {
    orders,
    source: data?.source ?? "live",
    isLoading,
    isFetching,
    isError,
    refetch,
  };
}
