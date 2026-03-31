"use client";

import { useQuery } from "@tanstack/react-query";
import type { TokenMetadata } from "@dynamic-demos/coingecko";

export type { TokenMetadata };

export function useTokenMetadata(symbol: string) {
  return useQuery({
    queryKey: ["trade", "metadata", symbol],
    queryFn: async (): Promise<TokenMetadata> => {
      const res = await fetch(
        `/api/trade/metadata?symbol=${encodeURIComponent(symbol)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch token metadata");
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
  });
}
