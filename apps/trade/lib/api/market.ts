/**
 * Market data fetcher (server-side)
 *
 * Fetches top tokens by market cap from CoinGecko Demo API.
 */

import { env } from "@/lib/env";

export interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number | null;
  market_cap: number | null;
  market_cap_rank: number | null;
  fully_diluted_valuation: number | null;
  total_volume: number | null;
  price_change_percentage_1h_in_currency?: number | null;
  price_change_percentage_24h: number | null;
  sparkline_in_7d?: { price: number[] };
}

export async function getMarketCoins(params?: {
  page?: number;
  perPage?: number;
  order?: string;
}): Promise<MarketCoin[]> {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 25;
  const order = params?.order ?? "market_cap_desc";

  const baseUrl = "https://api.coingecko.com/api/v3";
  const searchParams = new URLSearchParams({
    vs_currency: "usd",
    order,
    per_page: String(perPage),
    page: String(page),
    sparkline: "true",
    price_change_percentage: "1h,24h",
  });

  const url = `${baseUrl}/coins/markets?${searchParams.toString()}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (env.COIN_GECKO_API_KEY) {
    headers["x-cg-demo-api-key"] = env.COIN_GECKO_API_KEY;
  }

  const res = await fetch(url, {
    headers,
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch market data: ${err}`);
  }

  return res.json();
}
