/**
 * Exchange Config - the per-prospect branding + theme the dashboard stores for
 * this demo (kind "exchange"). Same shape as trade: branding in the row, the
 * theme hydrated from the bound Prospect by the dashboard's mapper.
 */

import type { WidgetTheme } from "@dynamic-demos/theme";

export interface ExchangeBranding {
  /** Hosted logo URL. When set it replaces the Exchange wordmark. */
  logoUrl?: string;
  /** Display name in the app bar and tab title (default: "Exchange"). */
  appName?: string;
}

export interface ExchangeConfig {
  branding?: ExchangeBranding;
  /**
   * Per-brand theme overrides, projected onto `--brand-*` by the root layout
   * via `widgetThemeToBrandTheme` + `<ThemeStyleTag overridesOnly>` (D-008).
   * Unspecified tokens fall back to Exchange's amber palette in `globals.css`,
   * then to `@dynamic-demos/theme/defaults.css`.
   */
  theme?: Partial<WidgetTheme>;
}

export const DEFAULT_APP_NAME = "Exchange";
