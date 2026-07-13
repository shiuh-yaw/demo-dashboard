/**
 * Brand Theme — the canonical CSS variable contract (D-007).
 *
 * Mirrors the tokens defined in `defaults.css`. Apps inject overrides via
 * <ThemeStyleTag> at SSR time (D-008). Components in `@dynamic-demos/ui`
 * consume these as `var(--brand-*)`.
 *
 * Keep this file in sync with `defaults.css`. If you add a token here, add
 * the corresponding fallback in `defaults.css` and the projection in
 * `themeToCssVars`.
 */

/**
 * Strongly-typed shape of every `--brand-*` token. All fields optional —
 * unspecified values fall back to the defaults defined in `defaults.css`
 * (and re-encoded in `BRAND_DEFAULTS` for `themeToCssVars`).
 */
export interface BrandTheme {
  /** Page-level background. Maps to `--brand-page-bg`. */
  pageBackground?: string;
  /** Card/widget surface. Maps to `--brand-surface`. */
  surface?: string;
  /** Default text/foreground. Maps to `--brand-fg`. */
  foreground?: string;
  /** Secondary body text. Maps to `--brand-fg-secondary`. */
  fgSecondary?: string;

  /** Primary brand color. Maps to `--brand-primary`. */
  primary?: string;
  /** Primary hover state. Maps to `--brand-primary-hover`. */
  primaryHover?: string;
  /** Text on primary. Maps to `--brand-primary-fg`. */
  primaryFg?: string;
  /** Accent color (loading, success-hint, secondary actions). */
  accent?: string;
  /** Text on accent. Maps to `--brand-accent-fg`. */
  accentFg?: string;

  /** Card-gradient start. Maps to `--brand-card-gradient-start`. */
  cardGradientStart?: string;
  /** Card-gradient end. Maps to `--brand-card-gradient-end`. */
  cardGradientEnd?: string;

  /** Row background. Maps to `--brand-row-bg`. */
  rowBackground?: string;
  /** Row hover background. Maps to `--brand-row-hover`. */
  rowHover?: string;
  /** Row divider color. Maps to `--brand-row-divider`. */
  rowDivider?: string;
  /** Strip background (banner-style sections). Maps to `--brand-strip-bg`. */
  stripBackground?: string;

  /** Muted/secondary text. Maps to `--brand-muted`. */
  muted?: string;
  /** Default border. Maps to `--brand-border`. */
  border?: string;
  /** Input border (slightly darker than default). Maps to `--brand-input-border`. */
  inputBorder?: string;

  /** Success hue. Maps to `--brand-success`. */
  success?: string;
  /** Warning hue. Maps to `--brand-warning`. */
  warning?: string;
  /** Error hue. Maps to `--brand-error`. */
  error?: string;

  /** Status badge — completed background. */
  statusCompletedBg?: string;
  /** Status badge — completed foreground. */
  statusCompletedFg?: string;
  /** Status badge — pending background. */
  statusPendingBg?: string;
  /** Status badge — pending foreground. */
  statusPendingFg?: string;
  /** Status badge — failed background. */
  statusFailedBg?: string;
  /** Status badge — failed foreground. */
  statusFailedFg?: string;
  /** Status badge — failed border. */
  statusFailedBorder?: string;

  /** Small radius (e.g., chips, status pills). Maps to `--brand-radius-sm`. */
  radiusSm?: string;
  /** Default radius (cards, inputs, buttons). Maps to `--brand-radius`. */
  radius?: string;
  /** Large radius (modals, hero cards). Maps to `--brand-radius-lg`. */
  radiusLg?: string;
}

/**
 * Default values mirroring `defaults.css`. These are the canonical fallbacks
 * for the `--brand-*` token contract — keep them in lockstep with the CSS file.
 */
export const BRAND_DEFAULTS: Required<BrandTheme> = {
  pageBackground: "#f4f5f7",
  surface: "#ffffff",
  foreground: "#0e121b",
  fgSecondary: "#525866",

  primary: "#4779ff",
  primaryHover: "#2f61e8",
  primaryFg: "#ffffff",
  accent: "#4779ff",
  accentFg: "#ffffff",

  cardGradientStart:
    "color-mix(in srgb, var(--brand-primary) 10%, var(--brand-surface))",
  cardGradientEnd:
    "color-mix(in srgb, var(--brand-primary) 2%, var(--brand-surface))",

  rowBackground: "#f9fafb",
  rowHover: "#f4f5f7",
  rowDivider: "#f2f3f5",
  stripBackground: "#fafbfc",

  muted: "#99a0ae",
  border: "#e1e4ea",
  inputBorder: "#d2d6de",

  success: "#16a34a",
  warning: "#f59e0b",
  error: "#dc2626",

  statusCompletedBg: "#e7f6ec",
  statusCompletedFg: "#15803d",
  statusPendingBg: "#fef3c7",
  statusPendingFg: "#92400e",
  statusFailedBg: "#fee2e2",
  statusFailedFg: "#b91c1c",
  statusFailedBorder: "#fecaca",

  radiusSm: "6px",
  radius: "10px",
  radiusLg: "22px",
};
