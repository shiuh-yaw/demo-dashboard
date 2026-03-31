/**
 * Token metadata from CoinGecko search
 */

import { coingeckoFetchOptional } from "./client";
import type { CoinGeckoOptions } from "./client";

export interface TokenMetadata {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  logo: string | null;
}

interface SearchCoin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank?: number;
  thumb: string;
  large: string;
}

export async function getTokenMetadata(
  symbol: string,
  options: CoinGeckoOptions = {},
): Promise<TokenMetadata> {
  const json = await coingeckoFetchOptional<{ coins?: SearchCoin[] }>(
    `/search?query=${encodeURIComponent(symbol)}`,
    options,
  );

  if (!json?.coins?.length) {
    return { name: null, symbol, decimals: null, logo: null };
  }

  const match = json.coins.find(
    (c) => c.symbol?.toUpperCase() === symbol.toUpperCase(),
  );

  if (!match) {
    return { name: null, symbol, decimals: null, logo: null };
  }

  return {
    name: match.name ?? null,
    symbol: match.symbol ?? symbol,
    decimals: null,
    logo: match.large || match.thumb || null,
  };
}
