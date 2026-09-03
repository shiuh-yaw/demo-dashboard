/**
 * Rimau Config - the per-prospect branding + theme the dashboard stores for
 * this demo (kind "rimau"). Same shape as trade: branding in the row, the
 * theme hydrated from the bound Prospect by the dashboard's mapper.
 */

import type { WidgetTheme } from "@dynamic-demos/theme";

export interface RimauBranding {
  /** Hosted logo URL. When set it replaces the Rimau wordmark. */
  logoUrl?: string;
  /** Display name in the app bar and tab title (default: "Rimau"). */
  appName?: string;
}

export interface RimauConfig {
  branding?: RimauBranding;
  /**
   * Per-brand theme overrides, projected onto `--brand-*` by the root layout
   * via `widgetThemeToBrandTheme` + `<ThemeStyleTag overridesOnly>` (D-008).
   * Unspecified tokens fall back to Rimau's amber palette in `globals.css`,
   * then to `@dynamic-demos/theme/defaults.css`.
   */
  theme?: Partial<WidgetTheme>;
}

export const DEFAULT_APP_NAME = "Rimau";
