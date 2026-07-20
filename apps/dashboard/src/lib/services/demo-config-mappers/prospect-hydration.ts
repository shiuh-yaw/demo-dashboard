/**
 * Shared Prospect → config hydration helpers used by every per-kind
 * `toStored` mapper.
 *
 * Previously each mapper hand-picked 1–3 prospect fields (primary,
 * primaryHover, accent) when projecting a DemoConfigRecord back to its
 * stored shape. The extended Prospect palette (pageBackground, background,
 * foreground, mutedTextColor, borderColor, row*, gradient*) was never
 * overlaid — so apps rendered stale colours whenever the Prospect diverged
 * from the baked-in config payload. This module centralises the overlay
 * so every kind gets the full palette from one call.
 */

import type { Prospect } from "../types";

/**
 * Overlay all Prospect-row theme fields onto a config's stored theme.
 *
 * Core prospect colours (`primaryColor`, `primaryHoverColor`, `accentColor`)
 * always override the config's value. Extended palette fields only
 * override when the Prospect has a non-null value — otherwise the config's
 * own (possibly defaulted) value is preserved via the base spread.
 *
 * `themeOverrides` is applied last so per-record tweaks always win.
 *
 * @param prospect - The linked Prospect entity (`null` for legacy pre-prospect rows).
 * @param configTheme - The config's own stored theme (base layer).
 * @param themeOverrides - Per-record DemoConfig.themeOverrides (wins over everything).
 * @param opts.foregroundKey - Field name for the foreground colour in the
 *   config's theme type. Defaults to `"foregroundColor"` (WidgetTheme).
 *   Checkouts uses `"foreground"`.
 */
export function hydrateProspectTheme<T extends Record<string, unknown>>(
  prospect: Prospect | null,
  configTheme: T | null | undefined,
  themeOverrides: unknown,
  opts?: { foregroundKey?: string },
): T | undefined {
  if (!prospect) return configTheme ?? undefined;

  const fgKey = opts?.foregroundKey ?? "foregroundColor";

  return {
    ...configTheme,
    // Core prospect colours — always set from the Prospect row.
    primaryColor: prospect.primaryColor,
    primaryHoverColor: prospect.primaryHoverColor ?? undefined,
    accentColor: prospect.accentColor ?? undefined,
    // Extended palette — only override when Prospect has a value.
    ...(prospect.pageBackground != null && {
      pageBackground: prospect.pageBackground,
    }),
    ...(prospect.background != null && { background: prospect.background }),
    ...(prospect.foreground != null && { [fgKey]: prospect.foreground }),
    ...(prospect.mutedTextColor != null && {
      mutedTextColor: prospect.mutedTextColor,
    }),
    ...(prospect.borderColor != null && { borderColor: prospect.borderColor }),
    ...(prospect.rowBackground != null && {
      rowBackground: prospect.rowBackground,
    }),
    ...(prospect.rowHoverBackground != null && {
      rowHoverBackground: prospect.rowHoverBackground,
    }),
    ...(prospect.gradientFrom != null && { gradientFrom: prospect.gradientFrom }),
    ...(prospect.gradientTo != null && { gradientTo: prospect.gradientTo }),
    // Per-record overrides win over everything.
    ...(themeOverrides as object | null | undefined),
  } as unknown as T;
}

/**
 * Derive a `logoUrl` string from the Prospect for configs whose branding
 * stores the logo as a direct URL field (e.g. `branding.logoUrl` on
 * trade / visa-direct / remittance / earn, or `branding.logo` on
 * wallet / checkout where `logo` is a URL string).
 *
 * Returns `undefined` when the Prospect doesn't carry a custom logo so
 * callers can use `??` to fall back to the config's own value.
 */
export function prospectLogoUrl(prospect: Prospect | null): string | undefined {
  if (!prospect) return undefined;
  return prospect.logo === "custom" && prospect.logoUrl
    ? prospect.logoUrl
    : undefined;
}
