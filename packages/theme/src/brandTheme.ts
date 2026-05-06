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

  /** Primary brand color. Maps to `--brand-primary`. */
  primary?: string;
  /** Primary hover state. Maps to `--brand-primary-hover`. */
  primaryHover?: string;
  /** Accent color (loading, success-hint, secondary actions). */
  accent?: string;

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
  pageBackground: "#f5f5f7",
  surface: "#ffffff",
  foreground: "#1d1d1f",

  primary: "#0071e3",
  primaryHover: "#0077ed",
  accent: "#30d158",

  cardGradientStart: "#1d1d1f",
  cardGradientEnd: "#2c2c2e",

  rowBackground: "#f5f5f7",
  rowHover: "#eeeeef",
  rowDivider: "#f0f0f5",
  stripBackground: "#fafafc",

  muted: "#86868b",
  border: "#e8e8ed",
  inputBorder: "#d2d2d7",

  success: "#1b7f3b",
  error: "#ff3b30",

  statusCompletedBg: "#e8f8ee",
  statusCompletedFg: "#1b7f3b",
  statusPendingBg: "#fff3cc",
  statusPendingFg: "#92600a",
  statusFailedBg: "#fdecee",
  statusFailedFg: "#c62828",
  statusFailedBorder: "#ffcdd2",

  radiusSm: "8px",
  radius: "12px",
  radiusLg: "24px",
};
