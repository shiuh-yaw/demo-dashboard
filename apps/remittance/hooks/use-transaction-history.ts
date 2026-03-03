"use client";

import { useMemo } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";

export interface TxItem {
  hash: string;
  from: string;
  to: string;
  value: string;
  asset: string;
  category: string;
  timestamp: string;
  status: string;
}

export interface UseTransactionHistoryOptions {
  /** Server-fetched transactions for initial render. */
  initialData?: TxItem[];
}

export function useTransactionHistory(
  walletAddress: string,
  networkId: number,
  limit = 20,
  options?: UseTransactionHistoryOptions,
) {
  const { initialData } = options ?? {};
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["transactionHistory", walletAddress, networkId, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        address: walletAddress,
        networkId: String(networkId),
        limit: String(limit),
      });
      const res = await fetch(`/api/transactions/history?${params}`);
      if (!res.ok) throw new Error("Failed to fetch transaction history");
      const json = await res.json();
      return (json.transactions ?? []) as TxItem[];
    },
    enabled: !!walletAddress,
    initialData,
  });

  return {
    transactions: data ?? [],
    isLoading,
    isFetching,
    refetch,
  };
}

const HISTORY_PAGE_SIZE = 25;

export interface UseInfiniteTransactionHistoryOptions {
  /** Server-fetched first page for initial render. */
  initialData?: TxItem[];
}

export function useInfiniteTransactionHistory(
  walletAddress: string,
  networkId: number,
  options?: UseInfiniteTransactionHistoryOptions,
) {
  const { initialData } = options ?? {};
  const query = useInfiniteQuery({
    queryKey: ["transactionHistoryInfinite", walletAddress, networkId],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        address: walletAddress,
        networkId: String(networkId),
        limit: String(HISTORY_PAGE_SIZE),
      });
      if (pageParam) params.set("pageKey", pageParam);
      const res = await fetch(`/api/transactions/history?${params}`);
      if (!res.ok) throw new Error("Failed to fetch transaction history");
      const json = (await res.json()) as {
        transactions?: TxItem[];
        nextPageKey?: string | null;
      };
      return {
        transactions: (json.transactions ?? []) as TxItem[],
        nextPageKey: json.nextPageKey ?? null,
      };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextPageKey ?? undefined,
    enabled: !!walletAddress,
    placeholderData: initialData?.length
      ? {
          pages: [{ transactions: initialData, nextPageKey: null }],
          pageParams: [null],
        }
      : undefined,
  });

  const transactions = useMemo(() => {
    const all = query.data?.pages.flatMap((p) => p.transactions) ?? [];
    const seen = new Set<string>();
    return all.filter((tx) => {
      if (seen.has(tx.hash)) return false;
      seen.add(tx.hash);
      return true;
    });
  }, [query.data?.pages]);
  const hasNextPage = !!query.hasNextPage;
  const isFetchingNextPage = query.isFetchingNextPage;

  return {
    transactions,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
