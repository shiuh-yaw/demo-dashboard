/**
 * @dynamic-demos/theme
 *
 * Unified theming system for Dynamic demo apps.
 */

// Brand contract (D-007) — the canonical `--brand-*` token surface.
// Companion stylesheet: `@dynamic-demos/theme/defaults.css`.
export {
  BRAND_DEFAULTS,
  type BrandTheme,
} from "./brandTheme";
export { themeToCssVars, cssVarsToRootBlock } from "./themeToCssVars";

// SSR helpers (D-008) — inject theme overrides + fetch dashboard config.
export { ThemeStyleTag, type ThemeStyleTagProps } from "./ThemeStyleTag";
export {
  fetchDemoConfig,
  type FetchDemoConfigOpts,
} from "./fetchDemoConfig";

// Color math — promoted from apps/visa-direct/lib/visa-direct-config.ts so
// every consumer can derive hover states / accent variants without copying
// HSL conversion code.
export { darkenHex, lightenHex, mixHex } from "./colorMath";

// Base theme (shared properties)
export {
  BORDER_RADIUS_SCALE,
  DEFAULT_BASE_THEME,
  DEFAULT_BASE_BRANDING,
  type BaseTheme,
  type BaseBranding,
} from "./base";

// Widget theme (Checkouts, Wallet)
export {
  DEFAULT_WIDGET_THEME,
  DEFAULT_WIDGET_BRANDING,
  DEFAULT_WIDGET_CONFIG,
  widgetThemeToCssVars,
  widgetThemeToBrandTheme,
  createWidgetConfig,
  type WidgetTheme,
  type WidgetBranding,
  type WidgetConfig,
} from "./widget";

// Dashboard theme (Earn)
export {
  DEFAULT_DASHBOARD_THEME,
  DEFAULT_DASHBOARD_BRANDING,
  DEFAULT_DASHBOARD_LAYOUT,
  dashboardThemeToCssVars,
  createDashboardConfig,
  type DashboardTheme,
  type DashboardBranding,
  type DashboardLayout,
  type DashboardConfig,
} from "./dashboard";

// GTM presets
export {
  // Dashboard presets
  STREAMING_THEME,
  SOCIAL_THEME,
  FINANCE_THEME,
  PROFESSIONAL_THEME,
  DASHBOARD_PRESETS,
  // Widget presets
  FINTECH_WIDGET_THEME,
  DARK_WIDGET_THEME,
  MINIMAL_WIDGET_THEME,
  VIBRANT_WIDGET_THEME,
  WIDGET_PRESETS,
} from "./presets";
