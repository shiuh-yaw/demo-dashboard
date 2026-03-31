/**
 * Polymarket market types
 *
 * @see https://docs.polymarket.com/api-reference/introduction
 * @see https://docs.polymarket.com/api-spec/gamma-openapi.yaml
 */

export interface ImageOptimization {
  imageUrlSource?: string | null;
  imageUrlOptimized?: string | null;
}

export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  endDate: string;
  category: string;
  image?: string | null;
  icon?: string | null;
  imageOptimized?: ImageOptimization | null;
  iconOptimized?: ImageOptimization | null;
  outcomes?: string;
  outcomePrices?: string;
  volume?: string;
  volumeNum?: number;
  active?: boolean;
  closed?: boolean;
  clobTokenIds?: string;
}

export interface PolymarketMarketTransformed {
  id: string;
  question: string;
  /** Outcome label for multi-outcome events (e.g. "NVIDIA", "Apple") - use for preview instead of full question */
  outcomeLabel?: string;
  endDate: string;
  yesPrice: string;
  noPrice: string;
  category: string;
  /** Raw category slug for filtering (e.g. politics, sports, crypto) */
  rawCategory?: string;
  imageUrl: string;
  yesTraders: number;
  noTraders: number;
  conditionId: string;
  yesTokenId?: string;
  noTokenId?: string;
  tags: string[];
  volume: number;
}

/** Event with nested markets - display one card per event, click to see markets */
export interface PolymarketEventTransformed {
  id: string;
  slug: string;
  title: string;
  imageUrl: string;
  category: string;
  rawCategory: string;
  volume: number;
  markets: PolymarketMarketTransformed[];
  /** Earliest endDate among markets */
  endDate: string;
  /** Event start date (ISO) - used for chart full history */
  startDate?: string;
  tags: string[];
}
