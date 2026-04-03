/**
 * Trade Config
 *
 * Branding configuration for the trade app.
 */

export interface TradeBranding {
  /** URL to a hosted logo. When provided, uses custom logo; otherwise Dynamic logo. */
  logoUrl?: string;
  /** Display name in header (default: "NovaX") */
  appName?: string;
}

export interface TradeConfig {
  branding?: TradeBranding;
}

export interface StoredTradeConfig {
  id: string;
  name: string;
  config: TradeConfig;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}
