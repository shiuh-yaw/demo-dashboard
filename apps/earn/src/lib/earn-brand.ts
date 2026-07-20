/**
 * Project the stored `WidgetTheme` (D-008 canonical input contract,
 * aliased locally as `EarnTheme`) onto a `Partial<BrandTheme>` overlay
 * consumed by `<ThemeStyleTag overridesOnly>` in `app/layout.tsx`.
 *
 * Delegates to the shared `widgetThemeToBrandTheme` (packages/theme) so
 * earn derives the same D-030 tokens as wallet/deposit/shop/visa-direct
 * (`primaryFg`/`accentFg` via `readableTextOn`, `fgSecondary` mixing) -
 * bespoke projection drifted (earn never derived text-on-primary, so
 * branded buttons could disagree with wallet's). The one earn-specific
 * step kept here: earn-era brand data was stored with `backgroundColor`
 * / `backgroundLightColor` as the page/surface keys (legacy from before
 * `WidgetTheme` added `pageBackground` and `background`), so those are
 * normalized onto the WidgetTheme names first, preferring the canonical
 * names when both are present.
 */
import {
  widgetThemeToBrandTheme,
  type BrandTheme,
  type WidgetTheme,
} from "@dynamic-demos/theme";
import type { EarnTheme } from "./earn-config";

export function themeToBrandTheme(
  theme: Partial<EarnTheme> = {},
): Partial<BrandTheme> {
  const normalized: Partial<WidgetTheme> = {
    ...theme,
    pageBackground: theme.pageBackground ?? theme.backgroundColor,
    background: theme.background ?? theme.backgroundLightColor,
  };
  return widgetThemeToBrandTheme(normalized);
}

// Re-export WidgetTheme so callsites can import it from the earn-brand
// module if they need the canonical name.
export type { WidgetTheme };
