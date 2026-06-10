/**
 * Shared Brand → config hydration helpers used by every per-kind
 * `toStored` mapper.
 *
 * Previously each mapper hand-picked 1–3 brand fields (primary,
 * primaryHover, accent) when projecting a DemoConfigRecord back to its
 * stored shape. The extended Brand palette (pageBackground, background,
 * foreground, mutedTextColor, borderColor, row*, gradient*) was never
 * overlaid — so apps rendered stale colours whenever the Brand diverged
 * from the baked-in config payload. This module centralises the overlay
 * so every kind gets the full palette from one call.
 */

import type { Brand } from "../types";

/**
 * Overlay all Brand-row theme fields onto a config's stored theme.
 *
 * Core brand colours (`primaryColor`, `primaryHoverColor`, `accentColor`)
 * always override the config's value. Extended palette fields only
 * override when the Brand has a non-null value — otherwise the config's
 * own (possibly defaulted) value is preserved via the base spread.
 *
 * `themeOverrides` is applied last so per-record tweaks always win.
 *
 * @param brand - The linked Brand entity (`null` for legacy pre-brand rows).
 * @param configTheme - The config's own stored theme (base layer).
 * @param themeOverrides - Per-record DemoConfig.themeOverrides (wins over everything).
 * @param opts.foregroundKey - Field name for the foreground colour in the
 *   config's theme type. Defaults to `"foregroundColor"` (WidgetTheme).
 *   Checkouts uses `"foreground"`.
 */
export function hydrateBrandTheme<T extends Record<string, unknown>>(
  brand: Brand | null,
  configTheme: T | null | undefined,
  themeOverrides: unknown,
  opts?: { foregroundKey?: string },
): T | undefined {
  if (!brand) return configTheme ?? undefined;

  const fgKey = opts?.foregroundKey ?? "foregroundColor";

  return {
    ...configTheme,
    // Core brand colours — always set from the Brand row.
    primaryColor: brand.primaryColor,
    primaryHoverColor: brand.primaryHoverColor ?? undefined,
    accentColor: brand.accentColor ?? undefined,
    // Extended palette — only override when Brand has a value.
    ...(brand.pageBackground != null && {
      pageBackground: brand.pageBackground,
    }),
    ...(brand.background != null && { background: brand.background }),
    ...(brand.foreground != null && { [fgKey]: brand.foreground }),
    ...(brand.mutedTextColor != null && {
      mutedTextColor: brand.mutedTextColor,
    }),
    ...(brand.borderColor != null && { borderColor: brand.borderColor }),
    ...(brand.rowBackground != null && {
      rowBackground: brand.rowBackground,
    }),
    ...(brand.rowHoverBackground != null && {
      rowHoverBackground: brand.rowHoverBackground,
    }),
    ...(brand.gradientFrom != null && { gradientFrom: brand.gradientFrom }),
    ...(brand.gradientTo != null && { gradientTo: brand.gradientTo }),
    // Per-record overrides win over everything.
    ...(themeOverrides as object | null | undefined),
  } as unknown as T;
}

/**
 * Derive a `logoUrl` string from the Brand for configs whose branding
 * stores the logo as a direct URL field (e.g. `branding.logoUrl` on
 * trade / visa-direct / remittance / earn, or `branding.logo` on
 * wallet / checkout where `logo` is a URL string).
 *
 * Returns `undefined` when the Brand doesn't carry a custom logo so
 * callers can use `??` to fall back to the config's own value.
 */
export function brandLogoUrl(brand: Brand | null): string | undefined {
  if (!brand) return undefined;
  return brand.logo === "custom" && brand.logoUrl
    ? brand.logoUrl
    : undefined;
}
