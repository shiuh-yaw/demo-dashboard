"use client";

import { useQuery } from "@tanstack/react-query";

export const CARD_BALANCE_QUERY_KEY = ["cardBalance"] as const;

export interface UseCardBalanceOptions {
  /** Server-fetched balance for initial render. */
  initialBalance?: number;
}

export function useCardBalance(options?: UseCardBalanceOptions) {
  const { initialBalance = 0 } = options ?? {};
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: CARD_BALANCE_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/deposits/balance");
      if (!res.ok) throw new Error("Failed to fetch card balance");
      const json = await res.json();
      return (json.cardBalance ?? 0) as number;
    },
    initialData: initialBalance,
  });

  return {
    balance: data ?? initialBalance,
    isLoading,
    isFetching,
    refetch,
  };
}
