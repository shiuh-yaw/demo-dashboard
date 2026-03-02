/**
 * Earn Config Client
 *
 * Fetches Earn configurations from the dashboard API.
 * This runs server-side for SSR/SSG earn pages.
 */

import { env } from "@/env";

// =============================================================================
// Types (mirrored from demo-dashboard)
// =============================================================================

/**
 * Supported logo/brand types
 * "custom" allows passing a hosted SVG URL via logoUrl
 */
export type EarnBrand = "dynamic" | "youtube" | "meta" | "remitly" | "custom";

/**
 * Border radius size tokens
 */
export type BorderRadiusSize = "xs" | "sm" | "md" | "lg";

/**
 * Theme configuration for Earn demo
 */
export interface EarnTheme {
  /** Primary brand color (e.g., brand red, Meta blue) */
  primaryColor?: string;
  /** Primary color hover state */
  primaryHoverColor?: string;
  /** Accent color for highlights */
  accentColor?: string;
  /** Main background color */
  backgroundColor?: string;
  /** Light background variant */
  backgroundLightColor?: string;
  /** Primary text color */
  foregroundColor?: string;
  /** Secondary/muted text color */
  mutedTextColor?: string;
  /** Border color */
  borderColor?: string;
  /** Active/selected background color */
  activeBgColor?: string;
  /** Active/selected text color */
  activeTextColor?: string;
  /** Border radius size */
  borderRadius?: BorderRadiusSize;
}

/**
 * Branding configuration for Earn demo
 */
export interface EarnBranding {
  /** Which logo to display */
  logo: EarnBrand;
  /** URL to a hosted SVG logo (used when logo is "custom") */
  logoUrl?: string;
  /** Token name displayed in balances (e.g., "USDC", "PYUSD") */
  tokenName?: string;
  /** Page title shown on the main earn page (defaults to "Earn") */
  pageTitle?: string;
  /** Page description shown below the title */
  pageDescription?: string;
}

/**
 * Layout/UI configuration for Earn demo
 */
export interface EarnLayout {
  /** Whether to show the sidebar navigation */
  showSidebar?: boolean;
}

/**
 * Full Earn configuration
 */
export interface EarnConfig {
  /** Theme settings */
  theme?: EarnTheme;
  /** Branding settings */
  branding?: EarnBranding;
  /** Layout/UI settings */
  layout?: EarnLayout;
}

/**
 * Stored Earn configuration (from API)
 */
export interface StoredEarnConfig {
  /** Unique identifier */
  id: string;
  /** Display name for the config */
  name: string;
  /** Optional description */
  description?: string;
  /** The actual Earn configuration */
  config: EarnConfig;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default theme for Earn Dashboard
 */
export const DEFAULT_EARN_THEME: Required<EarnTheme> = {
  primaryColor: "#4779FF",
  primaryHoverColor: "#3968e8",
  accentColor: "#1967D2",
  backgroundColor: "#F9F9F9",
  backgroundLightColor: "#FFFFFF",
  foregroundColor: "#030303",
  mutedTextColor: "#606060",
  borderColor: "#DADADA",
  activeBgColor: "#E8F0FE",
  activeTextColor: "#1967D2",
  borderRadius: "md",
};

/**
 * Default branding (Dynamic logo)
 * Note: logoUrl is intentionally omitted as it's only used when logo is "custom"
 */
export const DEFAULT_EARN_BRANDING: Required<
  Pick<EarnBranding, "logo" | "tokenName" | "pageTitle" | "pageDescription">
> = {
  logo: "dynamic",
  tokenName: "USDC",
  pageTitle: "Earn",
  pageDescription: "Manage your earnings, balance, and payouts.",
};

/**
 * Default layout settings
 */
export const DEFAULT_EARN_LAYOUT: Required<EarnLayout> = {
  showSidebar: false,
};

/**
 * Default Earn configuration
 */
export const DEFAULT_EARN_CONFIG: EarnConfig = {
  theme: DEFAULT_EARN_THEME,
  branding: DEFAULT_EARN_BRANDING,
  layout: DEFAULT_EARN_LAYOUT,
};

// =============================================================================
// API Client
// =============================================================================

const DASHBOARD_API_URL = env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Fetch an Earn configuration by ID from the dashboard API
 */
export async function getEarnConfig(
  id: string,
): Promise<StoredEarnConfig | null> {
  try {
    const response = await fetch(`${DASHBOARD_API_URL}/api/earns/${id}`, {
      cache: "no-store", // Disable cache for development
    });

    if (!response.ok) {
      if (response.status === 404) return null;

      try {
        const errorData = await response.json();
        const errorMessage =
          (errorData as { error?: string }).error || `HTTP ${response.status}`;
        console.error(`API error fetching Earn config ${id}:`, errorMessage);
      } catch {
        console.error(`Failed to fetch Earn config ${id}: ${response.status}`);
      }
      return null;
    }

    const data = await response.json();

    // All responses are standardized to { success: true, data: T }
    if ("success" in data && data.success === true && "data" in data) {
      return (data as { success: true; data: StoredEarnConfig }).data;
    }

    // If response.ok is true but format is unexpected, log and return null
    console.error(`Unexpected response format for Earn config ${id}:`, data);
    return null;
  } catch (error) {
    console.error(`Error fetching Earn config ${id}:`, error);
    return null;
  }
}

// =============================================================================
// Theme Utilities
// =============================================================================

/**
 * Border radius scale configuration
 */
const BORDER_RADIUS_SCALE: Record<
  BorderRadiusSize,
  { sm: string; md: string; lg: string }
> = {
  xs: { sm: "2px", md: "4px", lg: "6px" },
  sm: { sm: "4px", md: "6px", lg: "10px" },
  md: { sm: "6px", md: "10px", lg: "16px" },
  lg: { sm: "10px", md: "16px", lg: "22px" },
};

/**
 * Converts theme config to CSS custom properties
 */
export function themeToCssVars(theme: EarnTheme): Record<string, string> {
  const merged = { ...DEFAULT_EARN_THEME, ...theme };
  const radiusScale = BORDER_RADIUS_SCALE[merged.borderRadius];

  return {
    "--color-earn-primary": merged.primaryColor,
    "--color-earn-dark": "#282828",
    "--color-earn-light": merged.backgroundColor,
    "--color-earn-border": merged.borderColor,
    "--color-earn-text-primary": merged.foregroundColor,
    "--color-earn-text-secondary": merged.mutedTextColor,
    "--color-earn-active-bg": merged.activeBgColor,
    "--color-earn-active-text": merged.activeTextColor,
    "--background": hexToRgb(merged.backgroundColor),
    "--foreground": hexToRgb(merged.foregroundColor),
    "--primary": hexToRgb(merged.primaryColor),
    "--muted-foreground": hexToRgb(merged.mutedTextColor),
    "--border": hexToRgb(merged.borderColor),
    "--radius": radiusScale.md,
  };
}

/**
 * Converts hex color to RGB values (space-separated)
 * e.g., "#FF0000" -> "255 0 0"
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0 0";
  return `${parseInt(result[1]!, 16)} ${parseInt(result[2]!, 16)} ${parseInt(
    result[3]!,
    16,
  )}`;
}

/**
 * Merge a partial config with defaults
 */
export function mergeWithDefaults(config?: EarnConfig): Required<EarnConfig> {
  return {
    theme: { ...DEFAULT_EARN_THEME, ...config?.theme },
    branding: { ...DEFAULT_EARN_BRANDING, ...config?.branding },
    layout: { ...DEFAULT_EARN_LAYOUT, ...config?.layout },
  };
}
