/**
 * Mock mode metadata structure.
 * Keys scoped by action: trade, earn, predict.
 * BALANCES is the single source of truth for mock token amounts across Portfolio, Trade, Swap, Predict.
 */

/** localStorage key for mock metadata (balances, trade, earn, predict) */
export const MOCK_METADATA_STORAGE_KEY = "trade-mock-metadata";

export const MOCK_METADATA_KEYS = {
  BALANCES: "balances",
  TRADE: "trade",
  EARN: "earn",
  PREDICT: "predict",
} as const;

/** Per-token balance (amount only; usdValue derived from market price) */
export interface MockTokenBalance {
  amount: number;
}

export interface MockVaultPosition {
  id: string;
  vaultAddress: string;
  vaultName: string;
  chainId: number;
  assetSymbol: string;
  assetName: string;
  assetLogoURI?: string | null;
  amount: string;
  apy: number | null;
  depositedAt: string; // ISO
}

export interface MockEarnMetadata {
  deposits?: MockVaultPosition[];
}

/** Reserved for future mock trades */
export type MockTradeMetadata = Record<string, unknown>;

export interface MockPredictPosition {
  id: string;
  marketId: string;
  marketQuestion: string;
  eventSlug: string;
  eventTitle: string;
  side: "yes" | "no";
  amount: string;
  price: string; // cents when bought, e.g. "65"
  placedAt: string; // ISO
  imageUrl?: string | null;
}

export interface MockPredictMetadata {
  positions?: MockPredictPosition[];
}

export type MockBalancesMetadata = Record<string, MockTokenBalance>;

export type MockMetadata = {
  [MOCK_METADATA_KEYS.BALANCES]?: MockBalancesMetadata;
  [MOCK_METADATA_KEYS.TRADE]?: MockTradeMetadata;
  [MOCK_METADATA_KEYS.EARN]?: MockEarnMetadata;
  [MOCK_METADATA_KEYS.PREDICT]?: MockPredictMetadata;
};
