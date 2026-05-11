/**
 * Project the dashboard's stored `WidgetTheme` (legacy operator config
 * shape) onto a `Partial<BrandTheme>` overlay consumed by
 * `<ThemeStyleTag overridesOnly>` in `app/layout.tsx`.
 *
 * Only the tokens wallet personalizes per brand are emitted; everything
 * else falls through to the static `--brand-*` defaults in
 * `app/globals.css` (which are wallet's own design language) and to
 * `@dynamic-demos/theme/defaults.css` below that. Zero FOUC,
 * zero hydration mismatch — the inline `<style>` beats client paint.
 */
import { darkenHex, type BrandTheme, type WidgetTheme } from "@dynamic-demos/theme";

export function themeToBrandTheme(
  theme: Partial<WidgetTheme> = {},
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
