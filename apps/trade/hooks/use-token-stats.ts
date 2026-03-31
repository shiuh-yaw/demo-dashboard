"use client";

import { useQuery } from "@tanstack/react-query";
import type { TokenStats } from "@dynamic-demos/coingecko";

export type { TokenStats };

export function useTokenStats(symbol: string) {
  return useQuery({
    queryKey: ["trade", "token-stats", symbol],
    queryFn: async (): Promise<TokenStats> => {
      const res = await fetch(
        `/api/trade/token-stats?symbol=${encodeURIComponent(symbol)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch token stats");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}
