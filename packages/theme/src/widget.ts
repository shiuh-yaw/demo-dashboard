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
import type { BrandTheme } from "./brandTheme";
import { darkenHex, mixHex, readableTextOn } from "./colorMath";

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
  /** Optional secondary brand color - seeds card-gradient derivation (deriveCardGradient); remittance's config editor drives it. */
  secondaryColor?: string;
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
// secondaryColor excluded - no default value by design, only present when gradient derivation is needed
export const DEFAULT_WIDGET_THEME: Required<Omit<WidgetTheme, "secondaryColor">> = {
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
// secondaryColor excluded - no default value by design, only present when gradient derivation is needed
const DARK_WIDGET_THEME_DEFAULTS: Required<Omit<WidgetTheme, "secondaryColor">> = {
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

/**
 * Canonical unbranded widget config — the Dynamic-brand identity baked
 * into the widget shape. Apps pass this as the `fallback` to
 * `fetchDemoConfig` so the no-id / 404 / network-error paths all render
 * a working demo against the same defaults the dashboard would emit
 * for an unbranded record.
 */
export const DEFAULT_WIDGET_CONFIG: Required<WidgetConfig> = createWidgetConfig();

/**
 * Project the dashboard's stored `WidgetTheme` onto a `Partial<BrandTheme>`
 * overlay consumed by `<ThemeStyleTag overridesOnly>` in each app's
 * `app/layout.tsx`. Only fields present on the input emit overrides;
 * unspecified fields fall through to the static `--brand-*` declarations
 * in the app's `globals.css` and then to `defaults.css`.
 *
 * Shared by every app whose stored config is the canonical `WidgetTheme`
 * shape (wallet / deposit / shop / visa-direct / trade). Apps whose
 * brand projection legitimately diverges (earn's richer `EarnTheme`,
 * remittance's secondary-color gradient, checkouts' legacy `foreground`
 * vs `foregroundColor` schema) keep their own kind-specific projector.
 */
export function widgetThemeToBrandTheme(
  theme: Partial<WidgetTheme> = {},
  opts?: { deriveCardGradient?: boolean },
): Partial<BrandTheme> {
  const overlay: Partial<BrandTheme> = {};

  if (theme.primaryColor) {
    overlay.primary = theme.primaryColor;
    overlay.primaryHover =
      theme.primaryHoverColor ?? darkenHex(theme.primaryColor, 12);
    overlay.accent = theme.accentColor ?? theme.primaryColor;
  } else if (theme.accentColor) {
    overlay.accent = theme.accentColor;
  }

  // D-030 derived tokens. Stored configs carry no explicit fields for
  // text-on-primary/-accent or secondary body text, so derive them from
  // the colors a brand does set — otherwise a branded page keeps the
  // canonical values (e.g. #525866 secondary text on a dark brand page).
  // `--brand-warning` is deliberately never projected: it's a semantic
  // hue, not a brand slot.
  if (overlay.primary) overlay.primaryFg = readableTextOn(overlay.primary);
  if (overlay.accent) overlay.accentFg = readableTextOn(overlay.accent);
  if (theme.foregroundColor) {
    overlay.fgSecondary = mixHex(
      theme.foregroundColor,
      theme.pageBackground ?? theme.background ?? "#ffffff",
      0.35,
    );
  }

  if (theme.pageBackground) overlay.pageBackground = theme.pageBackground;
  if (theme.background) overlay.surface = theme.background;
  if (theme.foregroundColor) overlay.foreground = theme.foregroundColor;
  if (theme.mutedTextColor) overlay.muted = theme.mutedTextColor;
  if (theme.borderColor) overlay.border = theme.borderColor;
  if (theme.rowBackground) overlay.rowBackground = theme.rowBackground;
  if (theme.rowHoverBackground) overlay.rowHover = theme.rowHoverBackground;

  // Card gradient: explicit gradientFrom/To always wins. With
  // deriveCardGradient (remittance), fall back to secondaryColor or a
  // darkened primary so brand cards get a gradient from one color.
  if (theme.gradientFrom) {
    overlay.cardGradientStart = theme.gradientFrom;
  } else if (opts?.deriveCardGradient) {
    if (theme.secondaryColor) {
      overlay.cardGradientStart = theme.secondaryColor;
    } else if (theme.primaryColor) {
      overlay.cardGradientStart = darkenHex(theme.primaryColor, 6);
    }
  }
  if (theme.gradientTo) {
    overlay.cardGradientEnd = theme.gradientTo;
  } else if (opts?.deriveCardGradient) {
    if (theme.secondaryColor) {
      overlay.cardGradientEnd = darkenHex(theme.secondaryColor, 12);
    } else if (theme.primaryColor) {
      overlay.cardGradientEnd = darkenHex(theme.primaryColor, 18);
    }
  }

  return overlay;
}
