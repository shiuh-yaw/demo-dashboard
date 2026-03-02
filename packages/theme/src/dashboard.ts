/**
 * Dashboard Theme Configuration
 *
 * Theme for dashboard-style apps (Earn).
 * These are full-page layouts with optional sidebar.
 */

import { hexToRgb } from "@dynamic-demos/utils";
import type { BaseTheme, BaseBranding } from "./base";
import {
  DEFAULT_BASE_THEME,
  DEFAULT_BASE_BRANDING,
  BORDER_RADIUS_SCALE,
} from "./base";

/**
 * Dashboard-specific theme extensions
 */
export interface DashboardTheme extends BaseTheme {
  /** Light background variant */
  backgroundLightColor: string;
  /** Active/selected background color */
  activeBgColor: string;
  /** Active/selected text color */
  activeTextColor: string;
}

/**
 * Dashboard branding configuration
 */
export interface DashboardBranding extends BaseBranding {
  /** Token name displayed in balances (e.g., "USDC", "PYUSD") */
  tokenName?: string;
  /** Page title shown on the main page */
  pageTitle?: string;
  /** Page description shown below the title */
  pageDescription?: string;
}

/**
 * Dashboard layout options
 */
export interface DashboardLayout {
  /** Whether to show the sidebar navigation */
  showSidebar?: boolean;
}

/**
 * Default dashboard theme values
 */
export const DEFAULT_DASHBOARD_THEME: Required<DashboardTheme> = {
  ...DEFAULT_BASE_THEME,
  backgroundLightColor: "#FFFFFF",
  activeBgColor: "#E8F0FE",
  activeTextColor: "#1967D2",
};

/**
 * Default dashboard branding values
 */
export const DEFAULT_DASHBOARD_BRANDING: Required<DashboardBranding> = {
  ...DEFAULT_BASE_BRANDING,
  tokenName: "USDC",
  pageTitle: "Earn",
  pageDescription: "Manage your earnings, balance, and payouts.",
};

/**
 * Default dashboard layout values
 */
export const DEFAULT_DASHBOARD_LAYOUT: Required<DashboardLayout> = {
  showSidebar: false,
};

/**
 * Convert dashboard theme to CSS custom properties
 */
export function dashboardThemeToCssVars(
  theme: Partial<DashboardTheme>
): Record<string, string> {
  const merged = { ...DEFAULT_DASHBOARD_THEME, ...theme };
  const radiusScale = BORDER_RADIUS_SCALE[merged.borderRadius];

  return {
    // Earn-specific variables
    "--color-earn-primary": merged.primaryColor,
    "--color-earn-dark": "#282828",
    "--color-earn-light": merged.backgroundColor,
    "--color-earn-border": merged.borderColor,
    "--color-earn-text-primary": merged.foregroundColor,
    "--color-earn-text-secondary": merged.mutedTextColor,
    "--color-earn-active-bg": merged.activeBgColor,
    "--color-earn-active-text": merged.activeTextColor,
    // shadcn-style variables (RGB for alpha support)
    "--background": hexToRgb(merged.backgroundColor),
    "--foreground": hexToRgb(merged.foregroundColor),
    "--primary": hexToRgb(merged.primaryColor),
    "--muted-foreground": hexToRgb(merged.mutedTextColor),
    "--border": hexToRgb(merged.borderColor),
    "--radius": radiusScale.md,
  };
}

/**
 * Dashboard configuration interface
 */
export interface DashboardConfig {
  theme?: Partial<DashboardTheme>;
  branding?: Partial<DashboardBranding>;
  layout?: Partial<DashboardLayout>;
}

/**
 * Merge partial dashboard config with defaults
 */
export function createDashboardConfig(
  config?: Partial<DashboardConfig>
): Required<DashboardConfig> {
  return {
    theme: { ...DEFAULT_DASHBOARD_THEME, ...config?.theme },
    branding: { ...DEFAULT_DASHBOARD_BRANDING, ...config?.branding },
    layout: { ...DEFAULT_DASHBOARD_LAYOUT, ...config?.layout },
  };
}
