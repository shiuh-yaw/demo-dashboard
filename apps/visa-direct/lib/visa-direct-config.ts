/**
 * Visa Direct Config
 *
 * Branding + theme configuration for the Visa Direct demo.
 *
 * Shapes and defaults are kept in sync with
 * apps/dashboard/src/lib/types/dashboard.ts (VisaDirectConfig +
 * DEFAULT_VISA_DIRECT_CONFIG + AIRBNB_VISA_DIRECT_PRESET). When you change
 * one, update the other.
 *
 * At runtime, the root layout fetches a stored config from the dashboard API
 * using the `?id=` query (or `visa_direct_config_id` cookie) and merges it
 * over the defaults below. The resolved theme is projected onto `--widget-*`
 * CSS custom properties via an inline <style> tag so there's no flash of
 * unthemed content.
 */

// =============================================================================
// Schema
// =============================================================================

export interface VisaDirectBranding {
  /** URL to a hosted logo. When provided, uses custom logo; otherwise Dynamic wordmark. */
  logoUrl?: string;
  /** Top demo banner text. When empty, the banner is hidden. */
  bannerText?: string;
}

export interface VisaDirectTheme {
  /**
   * Primary brand color — drives buttons, active states, badges, and the
   * OTP "Resend" link (aliased to accent in globals.css). Surfaces/text
   * stay neutral across brands — only the primary is themeable.
   */
  primaryColor: string;
}

export interface VisaDirectConfig {
  branding: VisaDirectBranding;
  theme: VisaDirectTheme;
}

// =============================================================================
// Defaults — Dynamic-branded, neutral slate palette
// =============================================================================

/** Default config: Dynamic branding + neutral theme. Used when no config id is resolved or the fetch fails. */
export const DEFAULT_VISA_DIRECT_CONFIG: VisaDirectConfig = {
  branding: {
    bannerText: "Demo environment — Visa Direct × Fireblocks",
  },
  theme: {
    primaryColor: "#4779FF",
  },
};

// =============================================================================
// CSS custom property projection
// =============================================================================

/**
 * Map a resolved theme to the `--widget-*` CSS custom properties consumed by
 * globals.css and Tailwind arbitrary color utilities like `bg-(--widget-primary)`.
 *
 * Returned as a `:root { ... }` CSS string so it can be rendered as an inline
 * <style> tag from the server and override the defaults in globals.css with
 * zero hydration mismatch and no FOUC.
 */
export function themeToCssVars(theme: VisaDirectTheme): string {
  return `:root {\n  --widget-primary: ${theme.primaryColor};\n}`;
}

// =============================================================================
// Theme Utilities
// =============================================================================

/**
 * Darken a hex color by reducing HSL lightness.
 * @param hex - Hex color (e.g. "#FF5A5F")
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
