/**
 * Trade Config
 *
 * Branding and theme configuration for the trade app.
 * Mirrors the remittance pattern for config-driven styles.
 * Theme is minimal: primary + optional secondary; other colors are derived.
 */

export interface TradeTheme {
  /** Primary accent color -- buttons, active states (default: #4779FF Dynamic blue) */
  primaryColor?: string;
  /** Optional secondary -- hover state, derived elements; if omitted, derived from primary */
  secondaryColor?: string;
}

export interface TradeBranding {
  /** URL to a hosted logo. When provided, uses custom logo; otherwise Dynamic logo. */
  logoUrl?: string;
  /** Display name in header (default: "NovaX") */
  appName?: string;
}

export interface TradeConfig {
  theme?: TradeTheme;
  branding?: TradeBranding;
}

export interface StoredTradeConfig {
  id: string;
  name: string;
  config: TradeConfig;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_TRADE_THEME: Required<TradeTheme> = {
  primaryColor: "#4779FF",
  secondaryColor: "#3563E0",
};

// =============================================================================
// Theme Utilities
// =============================================================================

/**
 * Darken a hex color by reducing HSL lightness.
 * @param hex - Hex color (e.g. "#00FF88")
 * @param amount - 0-100, how much to darken (e.g. 12 = ~12% darker)
 */
export function darkenHex(hex: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  let r = parseInt(result[1]!, 16) / 255;
  let g = parseInt(result[2]!, 16) / 255;
  let b = parseInt(result[3]!, 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  const newL = Math.max(0, l - amount / 100);
  const c = (1 - Math.abs(2 * newL - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = newL - c / 2;
  let nr = 0;
  let ng = 0;
  let nb = 0;
  if (h < 1 / 6) {
    nr = c;
    ng = x;
  } else if (h < 2 / 6) {
    nr = x;
    ng = c;
  } else if (h < 3 / 6) {
    ng = c;
    nb = x;
  } else if (h < 4 / 6) {
    ng = x;
    nb = c;
  } else if (h < 5 / 6) {
    nr = x;
    nb = c;
  } else {
    nr = c;
    nb = x;
  }
  r = Math.round((nr + m) * 255);
  g = Math.round((ng + m) * 255);
  b = Math.round((nb + m) * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Lighten a hex color by increasing HSL lightness.
 * @param hex - Hex color (e.g. "#4779FF")
 * @param amount - 0-100, how much to lighten (e.g. 15 = ~15% lighter)
 */
export function lightenHex(hex: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  let r = parseInt(result[1]!, 16) / 255;
  let g = parseInt(result[2]!, 16) / 255;
  let b = parseInt(result[3]!, 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  const newL = Math.min(1, l + amount / 100);
  const c = (1 - Math.abs(2 * newL - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = newL - c / 2;
  let nr = 0;
  let ng = 0;
  let nb = 0;
  if (h < 1 / 6) {
    nr = c;
    ng = x;
  } else if (h < 2 / 6) {
    nr = x;
    ng = c;
  } else if (h < 3 / 6) {
    ng = c;
    nb = x;
  } else if (h < 4 / 6) {
    ng = x;
    nb = c;
  } else if (h < 5 / 6) {
    nr = x;
    nb = c;
  } else {
    nr = c;
    nb = x;
  }
  r = Math.round((nr + m) * 255);
  g = Math.round((ng + m) * 255);
  b = Math.round((nb + m) * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Convert a hex color to an rgba string at the given alpha.
 */
export function hexToAlpha(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(71, 121, 255, ${alpha})`;
  const r = parseInt(result[1]!, 16);
  const g = parseInt(result[2]!, 16);
  const b = parseInt(result[3]!, 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Converts theme config to CSS custom properties.
 * Primary: accent color. Secondary: hover states.
 * Supports dual light/dark mode via isDark parameter.
 */
export function themeToCssVars(
  theme: TradeTheme,
  isDark = false,
): Record<string, string> {
  const merged = { ...DEFAULT_TRADE_THEME, ...theme };
  return {
    "--trade-accent": merged.primaryColor,
    "--trade-accent-hover": isDark
      ? lightenHex(merged.primaryColor, 15)
      : darkenHex(merged.primaryColor, 12),
    "--trade-accent-muted": hexToAlpha(
      merged.primaryColor,
      isDark ? 0.15 : 0.12,
    ),
    "--trade-secondary":
      merged.secondaryColor ?? darkenHex(merged.primaryColor, 10),
  };
}
