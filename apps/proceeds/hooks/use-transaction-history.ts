"use client";

import { useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { AssetTransfer } from "@dynamic-demos/alchemy";
import { subscribePayoutDemo } from "@/lib/payout-demo-store";

interface UseTransactionHistoryParams {
  address: string | null | undefined;
  networkId: number | null | undefined;
  limit?: number;
  enabled?: boolean;
}

interface HistoryPage {
  transfers: AssetTransfer[];
  nextPageKey: string | null;
}

export type { AssetTransfer };

/**
 * Fetch on-chain transaction history for a wallet via our `/api/transactions`
 * endpoint (which proxies Alchemy server-side so the API key stays secret).
 *
 * Auto-refetches every 60s and after a demo payout mint, so a fresh tx
 * surfaces as soon as Alchemy indexes it.
 */
export function useTransactionHistory({
  address,
  networkId,
  limit = 25,
  enabled = true,
}: UseTransactionHistoryParams) {
  const query = useInfiniteQuery({
    queryKey: ["alchemy-tx-history", networkId, address, limit],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }): Promise<HistoryPage> => {
      if (!address || !networkId) {
        return { transfers: [], nextPageKey: null };
      }
      const params = new URLSearchParams({
        address,
        networkId: String(networkId),
        limit: String(limit),
      });
      if (pageParam) params.set("pageKey", pageParam);

      const res = await fetch(`/api/transactions?${params.toString()}`, {
        signal,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          body?.error ?? `Transaction history request failed (${res.status})`,
        );
      }
      return (await res.json()) as HistoryPage;
    },
    getNextPageParam: (lastPage) => lastPage.nextPageKey ?? undefined,
    enabled: enabled && !!address && !!networkId,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    return subscribePayoutDemo(() => {
      // Give Alchemy a beat to index the mint before we refetch.
      setTimeout(() => query.refetch(), 3_000);
    });
  }, [query]);

  const transfers: AssetTransfer[] =
    query.data?.pages.flatMap((p) => p.transfers) ?? [];

  return {
    transfers,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
