/**
 * CoinGecko coins/markets endpoint
 */

import { coingeckoFetch } from "./client";
import type { CoinGeckoOptions } from "./client";

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

export interface GetMarketCoinsParams {
  page?: number;
  perPage?: number;
  order?: string;
}

export async function getMarketCoins(
  params?: GetMarketCoinsParams,
  options: CoinGeckoOptions = {},
): Promise<MarketCoin[]> {
  const page = params?.page ?? 1;
  const perPage = params?.perPage ?? 25;
  const order = params?.order ?? "market_cap_desc";

  const searchParams = new URLSearchParams({
    vs_currency: "usd",
    order,
    per_page: String(perPage),
    page: String(page),
    sparkline: "true",
    price_change_percentage: "1h,24h",
  });

  return coingeckoFetch<MarketCoin[]>(
    `/coins/markets?${searchParams.toString()}`,
    options,
  );
}
