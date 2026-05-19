/**
 * Earn Config Types + Defaults
 *
 * Schema and defaults for the Earn demo. Server-side fetching now lives
 * in `@dynamic-demos/theme/fetch-demo-config` against the unified
 * `/api/demo-configs/earn/[id]` endpoint; this file only owns the type
 * definitions and the Dynamic-branded defaults each layout passes as
 * the `fallback`.
 */

// =============================================================================
// Types (mirrored from demo-dashboard)
// =============================================================================

/**
 * Supported logo/brand types
 * "custom" allows passing a hosted SVG URL via logoUrl
 */
export type EarnBrand = "dynamic" | "youtube" | "meta" | "remitly" | "custom";

/**
 * Border radius size tokens
 */
export type BorderRadiusSize = "xs" | "sm" | "md" | "lg";

/**
 * Theme configuration for the Earn demo.
 *
 * Aligned on the canonical `WidgetTheme` contract from
 * `@dynamic-demos/theme/widget` (D-008): same field names every other
 * themed demo uses, plus an earn-only `backgroundLightColor` retained
 * because earn-era brand data was stored with that name as the surface
 * variant. New brands should set `background` (WidgetTheme name);
 * existing brands continue to work via the projector's legacy fallback.
 */
import type { WidgetTheme } from "@dynamic-demos/theme";

export type EarnTheme = Partial<WidgetTheme> & {
  /** Legacy alias for `WidgetTheme.background` — the widget/card surface. */
  backgroundLightColor?: string;
};

/**
 * Branding configuration for Earn demo
 */
export interface EarnBranding {
  /** Which logo to display */
  logo: EarnBrand;
  /** URL to a hosted SVG logo (used when logo is "custom") */
  logoUrl?: string;
  /** Token name displayed in balances (e.g., "USDC", "PYUSD") */
  tokenName?: string;
  /** Page title shown on the main earn page (defaults to "Earn") */
  pageTitle?: string;
  /** Page description shown below the title */
  pageDescription?: string;
}

/**
 * Layout/UI configuration for Earn demo
 */
export interface EarnLayout {
  /** Whether to show the sidebar navigation */
  showSidebar?: boolean;
}

/**
 * Full Earn configuration
 */
export interface EarnConfig {
  /** Theme settings */
  theme?: EarnTheme;
  /** Branding settings */
  branding?: EarnBranding;
  /** Layout/UI settings */
  layout?: EarnLayout;
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default theme for Earn Dashboard. Earn-specific design language
 * (Google-ish blue accent, near-white surface) baked in as a fallback
 * when no per-brand theme is set.
 */
export const DEFAULT_EARN_THEME: EarnTheme = {
  primaryColor: "#4779FF",
  primaryHoverColor: "#3968e8",
  accentColor: "#1967D2",
  backgroundColor: "#F9F9F9",
  backgroundLightColor: "#FFFFFF",
  foregroundColor: "#030303",
  mutedTextColor: "#606060",
  borderColor: "#DADADA",
  borderRadius: "md",
};

/**
 * Default branding (Dynamic logo)
 * Note: logoUrl is intentionally omitted as it's only used when logo is "custom"
 */
export const DEFAULT_EARN_BRANDING: Required<
  Pick<EarnBranding, "logo" | "tokenName" | "pageTitle" | "pageDescription">
> = {
  logo: "dynamic",
  tokenName: "USDC",
  pageTitle: "Earn",
  pageDescription: "Manage your earnings, balance, and payouts.",
};

/**
 * Default layout settings
 */
export const DEFAULT_EARN_LAYOUT: Required<EarnLayout> = {
  showSidebar: false,
};

/**
 * Default Earn configuration
 */
export const DEFAULT_EARN_CONFIG: EarnConfig = {
  theme: DEFAULT_EARN_THEME,
  branding: DEFAULT_EARN_BRANDING,
  layout: DEFAULT_EARN_LAYOUT,
};

