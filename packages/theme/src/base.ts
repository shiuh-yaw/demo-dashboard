/**
 * Base Theme Configuration
 *
 * Shared theme properties used by both widget and dashboard themes.
 */

import type { BorderRadiusSize, Brand } from "@dynamic-demos/types";

/**
 * Border radius scale configuration
 * Each size defines the sm, md (base), and lg (container) radius values
 */
export const BORDER_RADIUS_SCALE: Record<
  BorderRadiusSize,
  { sm: string; md: string; lg: string }
> = {
  xs: { sm: "2px", md: "4px", lg: "6px" },
  sm: { sm: "4px", md: "6px", lg: "10px" },
  md: { sm: "6px", md: "10px", lg: "16px" },
  lg: { sm: "10px", md: "16px", lg: "22px" },
};

/**
 * Base theme properties shared by all theme variants
 */
export interface BaseTheme {
  /** Primary button/accent color */
  primaryColor: string;
  /** Primary hover state color */
  primaryHoverColor: string;
  /** Accent color for highlights, links, loading states */
  accentColor: string;
  /** Main background color */
  backgroundColor: string;
  /** Primary text color */
  foregroundColor: string;
  /** Secondary/muted text color */
  mutedTextColor: string;
  /** Border color */
  borderColor: string;
  /** Border radius size token */
  borderRadius: BorderRadiusSize;
}

/**
 * Base branding properties shared by all variants
 */
export interface BaseBranding {
  /** Which logo to display */
  logo: Brand;
  /** URL to a hosted logo (used when logo is "custom") */
  logoUrl?: string;
  /** Brand/company name */
  name?: string;
  /** Show "Powered by Dynamic" footer watermark */
  showPoweredBy?: boolean;
}

/**
 * Default base theme values
 */
export const DEFAULT_BASE_THEME: Required<BaseTheme> = {
  primaryColor: "#4779FF",
  primaryHoverColor: "#3968e8",
  accentColor: "#1967D2",
  backgroundColor: "#F9F9F9",
  foregroundColor: "#030303",
  mutedTextColor: "#606060",
  borderColor: "#DADADA",
  borderRadius: "md",
};

/**
 * Default base branding values
 */
export const DEFAULT_BASE_BRANDING: Required<BaseBranding> = {
  logo: "dynamic",
  logoUrl: "",
  name: "Dynamic",
  showPoweredBy: true,
};
