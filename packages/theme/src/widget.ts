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
 * Default widget theme values
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
 * Default widget branding values
 */
export const DEFAULT_WIDGET_BRANDING: Required<WidgetBranding> = {
  ...DEFAULT_BASE_BRANDING,
  productImage: "",
};

/**
 * Convert widget theme to CSS custom properties
 */
export function widgetThemeToCssVars(
  theme: Partial<WidgetTheme>
): Record<string, string> {
  const merged = { ...DEFAULT_WIDGET_THEME, ...theme };
  const radiusScale = BORDER_RADIUS_SCALE[merged.borderRadius];

  return {
    "--widget-page-bg": merged.pageBackground,
    "--widget-bg": merged.background,
    "--widget-fg": merged.foregroundColor,
    "--widget-primary": merged.primaryColor,
    "--widget-primary-hover": merged.primaryHoverColor,
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
