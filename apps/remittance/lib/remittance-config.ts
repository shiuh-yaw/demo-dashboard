/**
 * Remittance Config
 *
 * Branding + theme contract for the remittance demo app.
 *
 * Theme uses `@dynamic-demos/theme`'s canonical `WidgetTheme` shape —
 * the same input contract every other themed app (wallet, checkouts,
 * deposit, shop, trade) consumes. The projector below mirrors
 * `apps/wallet/lib/wallet-brand.ts`: it maps `WidgetTheme` fields onto a
 * `Partial<BrandTheme>` overlay consumed by `<ThemeStyleTag overridesOnly>`
 * at SSR in `app/layout.tsx`. Fields not present on the stored config
 * fall through to `@dynamic-demos/theme/defaults.css` (and to the
 * `--brand-*` overrides declared in `app/globals.css`).
 */

import {
  darkenHex,
  type BrandTheme,
  type WidgetTheme,
} from "@dynamic-demos/theme";

export interface RemittanceBranding {
  /** URL to a hosted logo. When provided, uses custom logo; otherwise Dynamic logo. */
  logoUrl?: string;
}

/**
 * Remittance themes are `WidgetTheme` overlays — same shape every other
 * demo app uses. Type aliased for callsite ergonomics; treat as the
 * canonical `WidgetTheme` contract from `@dynamic-demos/theme/widget`.
 *
 * Retains an optional `secondaryColor` companion to `primaryColor` —
 * the remittance editor uses it to drive the card-gradient start when
 * no explicit `gradientFrom`/`gradientTo` is set. Other apps don't need
 * this field; it stays remittance-scoped.
 */
export type RemittanceTheme = Partial<WidgetTheme> & {
  /** Optional secondary brand color — drives card gradient when set. */
  secondaryColor?: string;
};

export interface RemittanceConfig {
  theme?: RemittanceTheme;
  branding?: RemittanceBranding;
}

/**
 * Project the stored `WidgetTheme` onto a `Partial<BrandTheme>` overlay
 * consumed by `<ThemeStyleTag overridesOnly>` at SSR.
 *
 * Mirrors `apps/wallet/lib/wallet-brand.ts` field-for-field — the unified
 * projector pattern (D-008). Only fields present on the input emit
 * overrides; unspecified fields fall through to `defaults.css` + the
 * static `--brand-*` declarations in `app/globals.css`.
 *
 * Remittance-specific: when no explicit gradient is set, `secondaryColor`
 * (or a darkened primary) seeds the card-gradient start.
 */
export function themeToBrandTheme(theme: RemittanceTheme = {}): Partial<BrandTheme> {
  const overlay: Partial<BrandTheme> = {};

  if (theme.primaryColor) {
    overlay.primary = theme.primaryColor;
    overlay.primaryHover =
      theme.primaryHoverColor ?? darkenHex(theme.primaryColor, 12);
    overlay.accent = theme.accentColor ?? theme.primaryColor;
  } else if (theme.accentColor) {
    overlay.accent = theme.accentColor;
  }

  if (theme.pageBackground) overlay.pageBackground = theme.pageBackground;
  if (theme.background) overlay.surface = theme.background;
  if (theme.foregroundColor) overlay.foreground = theme.foregroundColor;
  if (theme.mutedTextColor) overlay.muted = theme.mutedTextColor;
  if (theme.borderColor) overlay.border = theme.borderColor;
  if (theme.rowBackground) overlay.rowBackground = theme.rowBackground;
  if (theme.rowHoverBackground) overlay.rowHover = theme.rowHoverBackground;

  // Card gradient: explicit gradientFrom/To wins; else derive from
  // secondaryColor (or a darkened primary).
  if (theme.gradientFrom) {
    overlay.cardGradientStart = theme.gradientFrom;
  } else if (theme.secondaryColor) {
    overlay.cardGradientStart = theme.secondaryColor;
  } else if (theme.primaryColor) {
    overlay.cardGradientStart = darkenHex(theme.primaryColor, 6);
  }
  if (theme.gradientTo) {
    overlay.cardGradientEnd = theme.gradientTo;
  } else if (theme.secondaryColor) {
    overlay.cardGradientEnd = darkenHex(theme.secondaryColor, 12);
  } else if (theme.primaryColor) {
    overlay.cardGradientEnd = darkenHex(theme.primaryColor, 18);
  }

  return overlay;
}
