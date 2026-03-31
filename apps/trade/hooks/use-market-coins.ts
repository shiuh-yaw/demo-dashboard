"use client";

import { useQuery } from "@tanstack/react-query";
import type { MarketCoin } from "@dynamic-demos/coingecko";

export type { MarketCoin };

export function useMarketCoins(params?: { perPage?: number }) {
  const perPage = params?.perPage ?? 15;
  return useQuery({
    queryKey: ["trade", "market", perPage],
    queryFn: async (): Promise<MarketCoin[]> => {
      const searchParams = new URLSearchParams({ per_page: String(perPage) });
      const res = await fetch(`/api/trade/market?${searchParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch market data");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}
