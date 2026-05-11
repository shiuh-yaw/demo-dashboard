/**
 * Project the dashboard's stored `WidgetTheme` (legacy operator config
 * shape) onto a `Partial<BrandTheme>` overlay consumed by
 * `<ThemeStyleTag overridesOnly>` in `app/layout.tsx`.
 *
 * Only the tokens checkouts personalizes per brand are emitted; everything
 * else falls through to the static `--brand-*` defaults in
 * `app/globals.css` (which encode checkouts' own design language) and to
 * `@dynamic-demos/theme/defaults.css` below that. Zero FOUC,
 * zero hydration mismatch — the inline `<style>` beats client paint.
 *
 * NOTE: the source `WidgetTheme` is the local checkouts shape
 * (`apps/checkouts/lib/widget-config.ts`), which mirrors what the dashboard
 * actually persists in Redis under the legacy `payment-widget:` prefix —
 * field names like `foreground` (not `foregroundColor`). This intentionally
 * differs from `@dynamic-demos/theme.WidgetTheme`. Mirror of wallet's
 * `themeToBrandTheme` helper, adapted to checkouts' field names.
 */
import { darkenHex, type BrandTheme } from "@dynamic-demos/theme";
import type { WidgetTheme } from "./widget-config";

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
  if (theme.foreground) overlay.foreground = theme.foreground;
  if (theme.mutedTextColor) overlay.muted = theme.mutedTextColor;
  if (theme.borderColor) overlay.border = theme.borderColor;
  if (theme.rowBackground) overlay.rowBackground = theme.rowBackground;
  if (theme.rowHoverBackground) overlay.rowHover = theme.rowHoverBackground;
  if (theme.gradientFrom) overlay.cardGradientStart = theme.gradientFrom;
  if (theme.gradientTo) overlay.cardGradientEnd = theme.gradientTo;

  return overlay;
}
