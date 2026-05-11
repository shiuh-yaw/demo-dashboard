/**
 * Visa Direct Config
 *
 * Branding + theme schema for the Visa Direct demo. Defaults below are kept
 * in sync with `apps/dashboard/src/lib/types/dashboard.ts` (VisaDirectConfig +
 * DEFAULT_VISA_DIRECT_CONFIG + AIRBNB_VISA_DIRECT_PRESET). When you change
 * one, update the other.
 *
 * At runtime, the root layout fetches a stored config from the dashboard API
 * (using the `?theme=` query / `visa-direct_config_id` cookie / forwarded
 * `x-visa-direct-config-id` header) and merges it over the defaults below.
 * The resolved theme is projected onto `--brand-*` CSS variables via
 * `<ThemeStyleTag overridesOnly>` in `app/layout.tsx` (D-008). Color math
 * (e.g. deriving primary-hover) lives in `@dynamic-demos/theme/color-math`
 * and is consumed by `lib/visa-direct-brand.ts`.
 */

// =============================================================================
// Schema
// =============================================================================

import type { WidgetTheme } from "@dynamic-demos/theme";

export interface VisaDirectBranding {
  /** URL to a hosted logo. When provided, uses custom logo; otherwise Dynamic wordmark. */
  logoUrl?: string;
  /** Top demo banner text. When empty, the banner is hidden. */
  bannerText?: string;
}

/**
 * Visa Direct theme — canonical `WidgetTheme` shape (D-008).
 *
 * By design Visa Direct only personalizes `primaryColor` per brand —
 * its surfaces/text stay neutral across brands. The wider type lets
 * brand-side data flow through unchanged and lets the projector
 * (`lib/visa-direct-brand.ts`) opt-in to more fields later without a
 * type rewrite.
 */
export type VisaDirectTheme = Partial<WidgetTheme>;

export interface VisaDirectConfig {
  branding: VisaDirectBranding;
  theme: VisaDirectTheme;
}

// =============================================================================
// Defaults — Dynamic-branded, neutral slate palette
// =============================================================================

/** Default config: Dynamic branding + neutral theme. Used when no config id is resolved or the fetch fails. */
export const DEFAULT_VISA_DIRECT_CONFIG: VisaDirectConfig = {
  branding: {},
  theme: {
    primaryColor: "#4779FF",
  },
};
