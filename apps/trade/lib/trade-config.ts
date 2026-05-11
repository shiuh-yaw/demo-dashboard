/**
 * Trade Config
 *
 * Branding + theme configuration for the trade app.
 */

import type { WidgetTheme } from "@dynamic-demos/theme";

export interface TradeBranding {
  /** URL to a hosted logo. When provided, uses custom logo; otherwise Dynamic logo. */
  logoUrl?: string;
  /** Display name in header (default: "NovaX") */
  appName?: string;
}

export interface TradeConfig {
  branding?: TradeBranding;
  /**
   * Optional per-brand theme overrides.
   *
   * Server layout projects this onto `--brand-*` via
   * `themeToBrandTheme` + `<ThemeStyleTag overridesOnly>` (D-008).
   * Unspecified tokens fall back to trade's static palette in
   * `app/globals.css`, then to `@dynamic-demos/theme/defaults.css`.
   */
  theme?: Partial<WidgetTheme>;
}

export interface StoredTradeConfig {
  id: string;
  name: string;
  config: TradeConfig;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}
