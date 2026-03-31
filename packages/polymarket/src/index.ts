/**
 * @dynamic-demos/polymarket
 *
 * Polymarket Gamma API utilities for prediction market data.
 */

export { polymarketFetch } from "./client";

export {
  getPolymarketEvents,
  getPolymarketMarkets,
  getPolymarketEventBySlug,
  POLYMARKET_TAG_SLUGS,
} from "./markets";
export type { GetPolymarketEventsParams } from "./markets";

export {
  polymarketMarketSchema,
  polymarketMarketTransformedSchema,
  marketsResponseSchema,
  eventsResponseSchema,
  polymarketEventSchema,
  imageOptimizationSchema,
} from "./schema";

export { calculateTimeRemaining } from "./utils";

export {
  getPricesHistory,
  computePriceChange,
} from "./clob";
export type {
  PricePoint,
  PricesHistoryResponse,
  PricesHistoryInterval,
  GetPricesHistoryParams,
} from "./clob";

export type {
  PolymarketMarket,
  PolymarketMarketTransformed,
  PolymarketEventTransformed,
  ImageOptimization,
} from "./types";
