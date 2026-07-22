/**
 * Remittance Config
 *
 * Branding + theme contract for the remittance demo app.
 *
 * Theme uses `@dynamic-demos/theme`'s canonical `WidgetTheme` shape —
 * the same input contract every other themed app (wallet, checkouts,
 * deposit, shop, trade) consumes. The `WidgetTheme` contract is projected
 * onto a `Partial<BrandTheme>` overlay by `widgetThemeToBrandTheme` from
 * `@dynamic-demos/theme` (called with `deriveCardGradient: true` in
 * `app/layout.tsx`), emitted as `<ThemeStyleTag overridesOnly>` at SSR.
 * This file owns only the config types; fields not present on the stored
 * config fall through to `@dynamic-demos/theme/defaults.css`.
 */

import { type WidgetTheme } from "@dynamic-demos/theme";

export interface RemittanceBranding {
  /** URL to a hosted logo. When provided, uses custom logo; otherwise Dynamic logo. */
  logoUrl?: string;
  /** App name for the branded browser-tab title ("<appName> - Remittance"). */
  appName?: string;
}

/**
 * Remittance themes are `WidgetTheme` overlays — same shape every other
 * demo app uses. Type aliased for callsite ergonomics; treat as the
 * canonical `WidgetTheme` contract from `@dynamic-demos/theme`. The base
 * `WidgetTheme` now carries an optional `secondaryColor` field that drives
 * card-gradient derivation when no explicit gradient is set.
 */
export type RemittanceTheme = Partial<WidgetTheme>;

export interface RemittanceConfig {
  theme?: RemittanceTheme;
  branding?: RemittanceBranding;
}
