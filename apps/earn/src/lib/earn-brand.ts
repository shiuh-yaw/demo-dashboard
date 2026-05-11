/**
 * Project the stored `WidgetTheme` (D-008 canonical input contract,
 * aliased locally as `EarnTheme`) onto a `Partial<BrandTheme>` overlay
 * consumed by `<ThemeStyleTag overridesOnly>` in `app/layout.tsx`.
 *
 * Mirrors `apps/wallet/lib/wallet-brand.ts` field-for-field — same
 * pipeline every themed demo uses. The one earn-specific divergence:
 * earn-era brand data was stored with `backgroundColor` /
 * `backgroundLightColor` as the page/surface keys (legacy from before
 * `WidgetTheme` added `pageBackground` and `background`). The projector
 * prefers the WidgetTheme names when present, falling back to the
 * legacy keys, so both old and new stored configs theme correctly.
 */
import {
  darkenHex,
  type BrandTheme,
  type WidgetTheme,
} from "@dynamic-demos/theme";
import type { EarnTheme } from "./earn-config";

export function themeToBrandTheme(
  theme: Partial<EarnTheme> = {},
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

  // Page background — prefer WidgetTheme's `pageBackground`, fall back
  // to legacy `backgroundColor` (inherited from BaseTheme).
  const pageBg = theme.pageBackground ?? theme.backgroundColor;
  if (pageBg) overlay.pageBackground = pageBg;

  // Surface — prefer WidgetTheme's `background`, fall back to legacy
  // earn `backgroundLightColor`.
  const surface = theme.background ?? theme.backgroundLightColor;
  if (surface) overlay.surface = surface;

  if (theme.foregroundColor) overlay.foreground = theme.foregroundColor;
  if (theme.mutedTextColor) overlay.muted = theme.mutedTextColor;
  if (theme.borderColor) overlay.border = theme.borderColor;

  // WidgetTheme-native fields earn didn't expose before — flow through
  // when brands set them.
  if (theme.rowBackground) overlay.rowBackground = theme.rowBackground;
  if (theme.rowHoverBackground) overlay.rowHover = theme.rowHoverBackground;
  if (theme.gradientFrom) overlay.cardGradientStart = theme.gradientFrom;
  if (theme.gradientTo) overlay.cardGradientEnd = theme.gradientTo;

  return overlay;
}

// Re-export WidgetTheme so callsites can import it from the earn-brand
// module if they need the canonical name.
export type { WidgetTheme };
