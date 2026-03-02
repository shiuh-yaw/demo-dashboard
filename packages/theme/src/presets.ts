/**
 * GTM Theme Presets
 *
 * Pre-configured themes for GTM demos.
 * Named by color/style, NOT by brand - brands are configured via branding.logo
 */

import type { WidgetTheme } from "./widget";
import type { DashboardTheme } from "./dashboard";

// =============================================================================
// Dashboard-Style Presets (for Earn)
// =============================================================================

/**
 * Streaming theme - Red accent (video platforms)
 */
export const STREAMING_THEME: Partial<DashboardTheme> = {
  primaryColor: "#FF0000",
  primaryHoverColor: "#CC0000",
  accentColor: "#FF0000",
  activeBgColor: "#FFE0E0",
  activeTextColor: "#CC0000",
};

/**
 * Social theme - Blue accent (social networks)
 */
export const SOCIAL_THEME: Partial<DashboardTheme> = {
  primaryColor: "#0866FF",
  primaryHoverColor: "#0654D4",
  accentColor: "#0866FF",
  activeBgColor: "#E7F3FF",
  activeTextColor: "#0654D4",
};

/**
 * Finance theme - Green accent (finance/banking)
 */
export const FINANCE_THEME: Partial<DashboardTheme> = {
  primaryColor: "#00857C",
  primaryHoverColor: "#006B64",
  accentColor: "#00857C",
  activeBgColor: "#E0F5F3",
  activeTextColor: "#006B64",
};

/**
 * Professional theme - Dark blue (enterprise)
 */
export const PROFESSIONAL_THEME: Partial<DashboardTheme> = {
  primaryColor: "#1A365D",
  primaryHoverColor: "#153E75",
  accentColor: "#2B6CB0",
  activeBgColor: "#EBF8FF",
  activeTextColor: "#2B6CB0",
};

// =============================================================================
// Widget-Style Presets (for Checkouts, Wallet)
// =============================================================================

/**
 * Fintech widget theme - Green accent
 */
export const FINTECH_WIDGET_THEME: Partial<WidgetTheme> = {
  primaryColor: "#00857C",
  primaryHoverColor: "#006B64",
  accentColor: "#00857C",
};

/**
 * Dark widget theme - Dark mode
 */
export const DARK_WIDGET_THEME: Partial<WidgetTheme> = {
  pageBackground: "#000000",
  background: "#0a0a0a",
  foregroundColor: "#ffffff",
  primaryColor: "#a855f7",
  primaryHoverColor: "#9333ea",
  accentColor: "#a855f7",
  rowBackground: "#1a1a1a",
  rowHoverBackground: "#262626",
  mutedTextColor: "#a1a1aa",
  borderColor: "#27272a",
  borderRadius: "lg",
};

/**
 * Minimal widget theme - Clean, light
 */
export const MINIMAL_WIDGET_THEME: Partial<WidgetTheme> = {
  pageBackground: "#ffffff",
  background: "#ffffff",
  foregroundColor: "#18181b",
  primaryColor: "#18181b",
  primaryHoverColor: "#3f3f46",
  accentColor: "#3b82f6",
  rowBackground: "#fafafa",
  rowHoverBackground: "#f4f4f5",
  borderRadius: "sm",
};

/**
 * Vibrant widget theme - Colorful
 */
export const VIBRANT_WIDGET_THEME: Partial<WidgetTheme> = {
  primaryColor: "#8b5cf6",
  primaryHoverColor: "#7c3aed",
  accentColor: "#8b5cf6",
  gradientFrom: "#c4b5fd",
  gradientTo: "rgba(196, 181, 253, 0.15)",
  borderRadius: "lg",
};

// =============================================================================
// Preset Collections
// =============================================================================

/**
 * All dashboard presets
 */
export const DASHBOARD_PRESETS = {
  streaming: STREAMING_THEME,
  social: SOCIAL_THEME,
  finance: FINANCE_THEME,
  professional: PROFESSIONAL_THEME,
} as const;

/**
 * All widget presets
 */
export const WIDGET_PRESETS = {
  fintech: FINTECH_WIDGET_THEME,
  dark: DARK_WIDGET_THEME,
  minimal: MINIMAL_WIDGET_THEME,
  vibrant: VIBRANT_WIDGET_THEME,
} as const;
