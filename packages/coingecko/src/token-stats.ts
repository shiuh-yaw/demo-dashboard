/**
 * Token stats from CoinGecko (market cap, volume, description, etc.)
 */

import { coingeckoFetchOptional } from "./client";
import type { CoinGeckoOptions } from "./client";

export interface TokenStats {
  id: string;
  symbol: string;
  name: string;
  image: string;
  description?: string | null;
  links?: {
    homepage?: string | null;
    twitter?: string | null;
  };
  marketCap: number | null;
  fdv: number | null;
  totalVolume: number | null;
  high24h: number | null;
  low24h: number | null;
  ath?: number | null;
  atl?: number | null;
}

async function getCoinId(
  symbol: string,
  options: CoinGeckoOptions,
): Promise<string | null> {
  const json = await coingeckoFetchOptional<{
    coins?: Array<{ id: string; symbol: string }>;
  }>(`/search?query=${encodeURIComponent(symbol)}`, options);

  const match = json?.coins?.find(
    (c) => c.symbol?.toUpperCase() === symbol.toUpperCase(),
  );
  return match?.id ?? null;
}

export async function getTokenStats(
  symbol: string,
  options: CoinGeckoOptions = {},
): Promise<TokenStats | null> {
  const id = await getCoinId(symbol, options);
  if (!id) return null;

  const data = await coingeckoFetchOptional<{
    id: string;
    symbol: string;
    name: string;
    image?: { large?: string };
    description?: { en?: string };
    links?: {
      homepage?: string[];
      twitter_screen_name?: string;
    };
    market_data?: {
      market_cap?: { usd?: number };
      fully_diluted_valuation?: { usd?: number };
      total_volume?: { usd?: number };
      high_24h?: { usd?: number };
      low_24h?: { usd?: number };
      ath?: { usd?: number };
      atl?: { usd?: number };
    };
  }>(
    `/coins/${id}?localization=false&tickers=false&community_data=false&developer_data=false`,
    options,
  );

  if (!data) return null;

  const md = data.market_data ?? {};
  const links = data.links ?? {};
  const homepage = links.homepage?.[0] ?? null;
  const twitter = links.twitter_screen_name
    ? `https://x.com/${links.twitter_screen_name}`
    : null;

  return {
    id: data.id,
    symbol: data.symbol ?? symbol,
    name: data.name ?? symbol,
    image: data.image?.large ?? "",
    description: data.description?.en ?? null,
    links: { homepage, twitter },
    marketCap: md.market_cap?.usd ?? null,
    fdv: md.fully_diluted_valuation?.usd ?? null,
    totalVolume: md.total_volume?.usd ?? null,
    high24h: md.high_24h?.usd ?? null,
    low24h: md.low_24h?.usd ?? null,
    ath: md.ath?.usd ?? null,
    atl: md.atl?.usd ?? null,
  };
}
