/**
 * Project the stored `WidgetTheme` (D-008 canonical input contract,
 * aliased locally as `VisaDirectTheme`) onto a `Partial<BrandTheme>`
 * overlay consumed by `<ThemeStyleTag overridesOnly>` in `app/layout.tsx`.
 *
 * Mirrors `apps/wallet/lib/wallet-brand.ts` field-for-field. By design
 * visa-direct only personalizes `primaryColor` per brand — its
 * surfaces/text stay neutral. But the projector accepts the full
 * `WidgetTheme` surface so brands that set other fields (page bg,
 * surface, gradients) flow through automatically when the operator
 * opts in via the dashboard editor.
 *
 * Everything not present falls through to the static `--brand-*`
 * overrides in `app/globals.css` (visa-direct's own design language)
 * and to `@dynamic-demos/theme/defaults.css` below that.
 */
import {
  darkenHex,
  type BrandTheme,
  type WidgetTheme,
} from "@dynamic-demos/theme";

export function themeToBrandTheme(
  theme: Partial<WidgetTheme> = {},
): Partial<BrandTheme> {
  const overlay: Partial<BrandTheme> = {};

  if (theme.primaryColor) {
    overlay.primary = theme.primaryColor;
    overlay.primaryHover =
      theme.primaryHoverColor ?? darkenHex(theme.primaryColor, 12);
    // Visa Direct aliases accent to primary — used only by the OTP
    // "Resend" link. See globals.css invariant.
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
  if (theme.gradientFrom) overlay.cardGradientStart = theme.gradientFrom;
  if (theme.gradientTo) overlay.cardGradientEnd = theme.gradientTo;

  return overlay;
}
