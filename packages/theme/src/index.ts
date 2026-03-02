/**
 * @dynamic-demos/theme
 *
 * Unified theming system for Dynamic demo apps.
 */

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
  widgetThemeToCssVars,
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
