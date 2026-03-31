/**
 * Widget Theme Configuration
 *
 * Theme for widget-style apps (Checkouts, Wallet).
 * These are compact, centered, single-card layouts.
 */

import type { BaseTheme, BaseBranding } from "./base";
import {
  DEFAULT_BASE_THEME,
  DEFAULT_BASE_BRANDING,
  BORDER_RADIUS_SCALE,
} from "./base";

/**
 * Widget-specific theme extensions
 */
export interface WidgetTheme extends BaseTheme {
  /** Page/container background color */
  pageBackground: string;
  /** Widget card background color */
  background: string;
  /** Row/item background color */
  rowBackground: string;
  /** Row hover background color */
  rowHoverBackground: string;
  /** Gradient start color (for token cards) */
  gradientFrom: string;
  /** Gradient end color (for token cards) */
  gradientTo: string;
}

/**
 * Widget branding configuration
 */
export interface WidgetBranding extends BaseBranding {
  /** Product image URL (for payment page) */
  productImage?: string;
}

/**
 * Default widget theme values (light mode)
 */
export const DEFAULT_WIDGET_THEME: Required<WidgetTheme> = {
  ...DEFAULT_BASE_THEME,
  primaryColor: "#121212",
  primaryHoverColor: "#2a2a2a",
  accentColor: "#4779FF",
  pageBackground: "#f6f8fa",
  background: "#ffffff",
  foregroundColor: "#000000",
  rowBackground: "#f6f8f8",
  rowHoverBackground: "#eef1f1",
  mutedTextColor: "#9a9a9a",
  borderColor: "#e7e8ed",
  gradientFrom: "#daffff",
  gradientTo: "rgba(218, 255, 255, 0.15)",
};

/**
 * Default dark mode widget theme values (used when isDark=true in widgetThemeToCssVars)
 */
const DARK_WIDGET_THEME_DEFAULTS: Required<WidgetTheme> = {
  ...DEFAULT_BASE_THEME,
  primaryColor: "#ffffff",
  primaryHoverColor: "#e5e5e5",
  accentColor: "#6B93FF",
  pageBackground: "#0A0A0A",
  background: "#161618",
  foregroundColor: "#ffffff",
  rowBackground: "#1C1C1E",
  rowHoverBackground: "#2C2C30",
  mutedTextColor: "#636366",
  borderColor: "#2C2C30",
  gradientFrom: "rgba(71, 121, 255, 0.15)",
  gradientTo: "rgba(71, 121, 255, 0.05)",
};

/**
 * Default widget branding values
 */
export const DEFAULT_WIDGET_BRANDING: Required<WidgetBranding> = {
  ...DEFAULT_BASE_BRANDING,
  productImage: "",
};

/**
 * Convert widget theme to CSS custom properties.
 * @param theme - Partial theme overrides
 * @param isDark - When true, uses dark mode base theme
 */
export function widgetThemeToCssVars(
  theme: Partial<WidgetTheme>,
  isDark = false
): Record<string, string> {
  const base = isDark ? DARK_WIDGET_THEME_DEFAULTS : DEFAULT_WIDGET_THEME;
  const merged = { ...base, ...theme };
  const radiusScale = BORDER_RADIUS_SCALE[merged.borderRadius];

  return {
    "--widget-page-bg": merged.pageBackground,
    "--widget-bg": merged.background,
    "--widget-fg": merged.foregroundColor,
    "--widget-primary": merged.accentColor,
    "--widget-primary-hover": merged.accentColor,
    "--widget-accent": merged.accentColor,
    "--widget-row-bg": merged.rowBackground,
    "--widget-row-hover": merged.rowHoverBackground,
    "--widget-muted": merged.mutedTextColor,
    "--widget-border": merged.borderColor,
    "--widget-gradient-from": merged.gradientFrom,
    "--widget-gradient-to": merged.gradientTo,
    "--widget-radius-sm": radiusScale.sm,
    "--widget-radius": radiusScale.md,
    "--widget-radius-lg": radiusScale.lg,
  };
}

/**
 * Widget configuration interface
 */
export interface WidgetConfig {
  theme?: Partial<WidgetTheme>;
  branding?: Partial<WidgetBranding>;
}

/**
 * Merge partial widget config with defaults
 */
export function createWidgetConfig(
  config?: Partial<WidgetConfig>
): Required<WidgetConfig> {
  return {
    theme: { ...DEFAULT_WIDGET_THEME, ...config?.theme },
    branding: { ...DEFAULT_WIDGET_BRANDING, ...config?.branding },
  };
}
