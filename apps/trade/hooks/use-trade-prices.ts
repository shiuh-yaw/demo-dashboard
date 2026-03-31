"use client";

import { useQuery } from "@tanstack/react-query";

export interface TradePrice {
  usd: number;
  usd_24h_change?: number;
}

/** Alchemy by-symbol response: { data: [{ symbol, prices: [{ currency, value, lastUpdatedAt }], error }] } */
function parseAlchemyPrices(data: {
  data?: Array<{
    symbol: string;
    prices?: Array<{ currency: string; value: string }>;
    error?: string | null;
  }>;
}): Record<string, TradePrice> {
  const mapped: Record<string, TradePrice> = {};
  const arr = data?.data ?? [];
  for (const item of arr) {
    if (item.error || !item.prices?.length) continue;
    const usdPrice = item.prices.find((p) => p.currency === "USD");
    if (usdPrice) {
      const usd = parseFloat(usdPrice.value);
      if (!Number.isNaN(usd)) {
        mapped[item.symbol] = { usd };
      }
    }
  }
  return mapped;
}

export function useTradePrices() {
  return useQuery({
    queryKey: ["trade", "prices"],
    queryFn: async () => {
      const res = await fetch("/api/trade/prices");
      if (!res.ok) throw new Error("Failed to fetch prices");
      const data = await res.json();
      return parseAlchemyPrices(data);
    },
    refetchInterval: 30_000,
  });
}
