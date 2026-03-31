/**
 * @dynamic-demos/coingecko
 *
 * CoinGecko API utilities for market data, token metadata, and stats.
 */

export { coingeckoFetch, coingeckoFetchOptional } from "./client";
export type { CoinGeckoOptions } from "./client";

export { getMarketCoins } from "./market";
export type { MarketCoin, GetMarketCoinsParams } from "./market";

export { getTokenMetadata } from "./metadata";
export type { TokenMetadata } from "./metadata";

export { getTokenStats } from "./token-stats";
export type { TokenStats } from "./token-stats";
