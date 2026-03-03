/**
 * Remittance Config
 *
 * Branding and theme configuration for the remittance app.
 * Mirrors the pattern used in earn/wallet/checkouts for custom styles.
 * Theme is minimal: primary + optional secondary; all other colors are derived.
 */

export interface RemittanceBranding {
  /** URL to a hosted logo. When provided, uses custom logo; otherwise Dynamic logo. */
  logoUrl?: string;
}

/**
 * Minimal theme: only primary and optional secondary.
 * Hover, accent derived from primary. Card gradient derived from secondary only.
 */
export interface RemittanceTheme {
  /** Primary brand color — buttons, header accents */
  primaryColor?: string;
  /** Optional secondary — card gradient (start → darker); if omitted, derived from primary */
  secondaryColor?: string;
}

export const DEFAULT_REMITTANCE_THEME: Required<RemittanceTheme> = {
  primaryColor: "#1a56db",
  secondaryColor: "#1e40af",
};

export interface RemittanceConfig {
  theme?: RemittanceTheme;
  branding?: RemittanceBranding;
}

// =============================================================================
// Theme Utilities
// =============================================================================

/**
 * Darken a hex color by reducing HSL lightness.
 * @param hex - Hex color (e.g. "#1a56db")
 * @param amount - 0–100, how much to darken (e.g. 12 = ~12% darker)
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
 * Converts theme config to CSS custom properties.
 * Primary: buttons, accents. Card gradient derived from secondary only.
 */
export function themeToCssVars(theme: RemittanceTheme): Record<string, string> {
  const merged = { ...DEFAULT_REMITTANCE_THEME, ...theme };
  const primaryHover = darkenHex(merged.primaryColor, 12);
  // Card gradient: secondary only (start → darker end)
  const cardBase =
    merged.secondaryColor ?? darkenHex(merged.primaryColor, 6);
  const cardGradientEnd = darkenHex(cardBase, 12);

  return {
    "--widget-primary": merged.primaryColor,
    "--widget-primary-hover": primaryHover,
    "--widget-accent": merged.primaryColor,
    "--widget-card-gradient-start": cardBase,
    "--widget-card-gradient-end": cardGradientEnd,
  };
}
