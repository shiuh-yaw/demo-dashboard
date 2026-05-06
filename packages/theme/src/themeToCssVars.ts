/**
 * `themeToCssVars` — projects a (partial) BrandTheme into the `--brand-*`
 * CSS variable record (D-007). Used by `<ThemeStyleTag>` for SSR overrides
 * (D-008) and by tests that lock the contract.
 *
 * Unspecified fields fall back to `BRAND_DEFAULTS`, which mirrors the values
 * declared in `defaults.css`. The output is a flat `Record<string, string>`
 * suitable for either CSS string serialization or React `style` prop usage.
 */

import { BRAND_DEFAULTS, type BrandTheme } from "./brandTheme";

export function themeToCssVars(
  theme: Partial<BrandTheme> = {},
): Record<string, string> {
  const merged: Required<BrandTheme> = { ...BRAND_DEFAULTS, ...theme };

  return {
    "--brand-page-bg": merged.pageBackground,
    "--brand-surface": merged.surface,
    "--brand-fg": merged.foreground,

    "--brand-primary": merged.primary,
    "--brand-primary-hover": merged.primaryHover,
    "--brand-accent": merged.accent,

    "--brand-card-gradient-start": merged.cardGradientStart,
    "--brand-card-gradient-end": merged.cardGradientEnd,

    "--brand-row-bg": merged.rowBackground,
    "--brand-row-hover": merged.rowHover,
    "--brand-row-divider": merged.rowDivider,
    "--brand-strip-bg": merged.stripBackground,

    "--brand-muted": merged.muted,
    "--brand-border": merged.border,
    "--brand-input-border": merged.inputBorder,

    "--brand-success": merged.success,
    "--brand-error": merged.error,

    "--brand-status-completed-bg": merged.statusCompletedBg,
    "--brand-status-completed-fg": merged.statusCompletedFg,
    "--brand-status-pending-bg": merged.statusPendingBg,
    "--brand-status-pending-fg": merged.statusPendingFg,
    "--brand-status-failed-bg": merged.statusFailedBg,
    "--brand-status-failed-fg": merged.statusFailedFg,
    "--brand-status-failed-border": merged.statusFailedBorder,

    "--brand-radius-sm": merged.radiusSm,
    "--brand-radius": merged.radius,
    "--brand-radius-lg": merged.radiusLg,
  };
}

/**
 * Render a CSS variable record as a `:root { ... }` block. Useful for
 * non-React consumers (raw `<style>` tags, Storybook decorators, tests).
 */
export function cssVarsToRootBlock(vars: Record<string, string>): string {
  const lines = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`);
  return `:root {\n${lines.join("\n")}\n}`;
}
