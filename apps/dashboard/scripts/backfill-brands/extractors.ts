/**
 * Pure functions that normalise legacy records into BrandSeed values.
 * Each extractor is total — invalid input returns null + an emitted
 * "skipped" record that the orchestrator surfaces in the report.
 *
 * Phase 2-brand-cutover (2026-05-06): the BrandProfile extractor now
 * pulls the full visual theme + logo discriminator + linked demo ids
 * out of the aggregate. Orphan extractors (earn / wallet / checkout /
 * remittance) stay narrow because the source records don't have the
 * full BrandTheme; their seeds set the new fields to null and the
 * service layer fills them with column defaults.
 */

import type {
  BrandProfile,
  BrandTheme,
  BorderRadiusSize,
  StoredEarnConfig,
  StoredWalletConfig,
  StoredCheckoutConfig,
  StoredRemittanceConfig,
} from "@/lib/types/dashboard";
import type { BrandBorderRadius, BrandLogoKind } from "@/lib/services/types";
import { isHexColor, normaliseHex } from "./hash";
import type { BrandSeed, BrandSource } from "./types";

export interface ExtractResult {
  seed: BrandSeed | null;
  /** Populated when `seed` is null. Surfaced as `reason` in the report. */
  skipReason?: string;
}

const BORDER_RADIUS_VALUES: ReadonlySet<BrandBorderRadius> = new Set([
  "xs",
  "sm",
  "md",
  "lg",
]);

function asBorderRadius(value: unknown): BrandBorderRadius | null {
  if (typeof value !== "string") return null;
  return BORDER_RADIUS_VALUES.has(value as BrandBorderRadius)
    ? (value as BrandBorderRadius)
    : null;
}

function asLogo(value: unknown): BrandLogoKind {
  return value === "custom" ? "custom" : "dynamic";
}

/**
 * Extract a hex colour if the input parses; otherwise return null.
 * Distinct from `normaliseHex` (which assumes the caller has already
 * checked) so extractors can tolerate junk in legacy records.
 */
function asHex(value: unknown): string | null {
  return isHexColor(value) ? normaliseHex(value as string) : null;
}

/**
 * `gradientFrom` / `gradientTo` accept rgba() strings as well as hex —
 * the legacy aggregate stores `rgba(218, 255, 255, 0.15)` for some
 * brands. Pass non-empty strings through verbatim; null otherwise.
 */
function asColourLike(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

interface BuildSeedArgs {
  source: BrandSource;
  ownerId: string | undefined;
  name: string;
  description?: string | null;
  /** Required hex; the seed is skipped if absent or unparseable. */
  primaryColor: unknown;
  /** Optional theme overlay for richer extraction (BrandProfile only). */
  theme?: Partial<Record<keyof BrandTheme, unknown>>;
  /** Optional theme-radius (legacy may also carry it on BrandSettings). */
  borderRadius?: unknown;
  logo?: unknown;
  logoUrl?: string | null;
  companyUrl?: string | null;
  /** Mirror the BrandProfile.demos linkage onto the seed. */
  demoEarnId?: string | null;
  demoCheckoutsId?: string | null;
  demoWalletId?: string | null;
  demoRemittanceId?: string | null;
  /** Convenience accessor for accent (used when no theme.accentColor). */
  accentColorFallback?: unknown;
  /** Used by the legacy convenience field `secondaryColor` heuristic. */
  secondaryColorFallback?: unknown;
}

function buildSeed(args: BuildSeedArgs): ExtractResult {
  if (!args.ownerId) {
    return { seed: null, skipReason: "missing ownerId" };
  }
  if (!isHexColor(args.primaryColor)) {
    return {
      seed: null,
      skipReason: `invalid primaryColor (${typeof args.primaryColor})`,
    };
  }
  const theme = args.theme ?? {};
  const seed: BrandSeed = {
    source: args.source,
    ownerId: args.ownerId,
    name: args.name,
    description: args.description ?? null,
    companyUrl: args.companyUrl ?? null,
    logo: asLogo(args.logo),
    logoUrl: args.logoUrl ?? null,
    borderRadius:
      asBorderRadius(theme.borderRadius) ?? asBorderRadius(args.borderRadius),
    primaryColor: normaliseHex(args.primaryColor as string),
    primaryHoverColor: asHex(theme.primaryHoverColor),
    accentColor: asHex(theme.accentColor) ?? asHex(args.accentColorFallback),
    secondaryColor: asHex(args.secondaryColorFallback),
    pageBackground: asHex(theme.pageBackground),
    background: asHex(theme.background),
    foreground: asHex(theme.foreground),
    mutedTextColor: asHex(theme.mutedTextColor),
    borderColor: asHex(theme.borderColor),
    rowBackground: asHex(theme.rowBackground),
    rowHoverBackground: asHex(theme.rowHoverBackground),
    gradientFrom: asColourLike(theme.gradientFrom),
    gradientTo: asColourLike(theme.gradientTo),
    demoEarnId: args.demoEarnId ?? null,
    demoCheckoutsId: args.demoCheckoutsId ?? null,
    demoWalletId: args.demoWalletId ?? null,
    demoRemittanceId: args.demoRemittanceId ?? null,
  };
  return { seed };
}

export function extractFromBrandProfile(
  profile: BrandProfile,
): ExtractResult {
  const settings = profile.brand;
  const theme: Partial<BrandTheme> = settings.theme ?? {};
  // Theme overlay wins when present, else convenience accessor.
  const primary = theme.primaryColor ?? settings.primaryColor;
  const accentFallback = settings.accentColor;
  const logoUrl =
    settings.logo === "custom" && settings.logoUrl ? settings.logoUrl : null;
  const radius: BorderRadiusSize | undefined =
    theme.borderRadius ?? settings.borderRadius;
  return buildSeed({
    source: { kind: "brand-profile", id: profile.id },
    ownerId: profile.ownerId,
    name: profile.name,
    description: null,
    primaryColor: primary,
    theme: theme as Partial<Record<keyof BrandTheme, unknown>>,
    borderRadius: radius,
    logo: settings.logo,
    logoUrl,
    companyUrl: profile.companyUrl ?? null,
    demoEarnId: profile.demos.earn ?? null,
    demoCheckoutsId: profile.demos.checkouts ?? null,
    demoWalletId: profile.demos.wallet ?? null,
    demoRemittanceId: profile.demos.remittance ?? null,
    accentColorFallback: accentFallback,
  });
}

export function extractFromEarn(config: StoredEarnConfig): ExtractResult {
  const branding = config.config.branding;
  const logoUrl =
    branding?.logo === "custom" && branding?.logoUrl ? branding.logoUrl : null;
  return buildSeed({
    source: { kind: "earn", id: config.id },
    ownerId: config.ownerId,
    name: config.name,
    description: config.description ?? null,
    primaryColor: config.config.theme?.primaryColor,
    accentColorFallback: config.config.theme?.accentColor,
    logo: branding?.logo,
    logoUrl,
  });
}

export function extractFromWallet(
  config: StoredWalletConfig,
): ExtractResult {
  const branding = config.config.branding;
  const logoUrl = branding?.logo ? branding.logo : null;
  return buildSeed({
    source: { kind: "wallet", id: config.id },
    ownerId: config.ownerId,
    name: config.name,
    description: config.description ?? null,
    primaryColor: config.config.theme?.primaryColor,
    accentColorFallback: config.config.theme?.accentColor,
    // Wallet stores the URL directly in `branding.logo`; treat any
    // non-empty value as a custom logo.
    logo: logoUrl ? "custom" : "dynamic",
    logoUrl,
  });
}

export function extractFromCheckout(
  config: StoredCheckoutConfig,
): ExtractResult {
  // The Checkout `theme` shape is an unconstrained Record-ish object
  // (it covers nextjs-payment-widget's superset of fields). Cast to
  // pick the brand-relevant fields without dragging the full type in.
  const theme = (config.config as { theme?: Record<string, unknown> })?.theme;
  const branding = (
    config.config as { branding?: { logo?: string } }
  )?.branding;
  return buildSeed({
    source: { kind: "checkout", id: config.id },
    ownerId: config.ownerId,
    name: config.name,
    description: config.description ?? null,
    primaryColor: theme?.primaryColor,
    accentColorFallback: theme?.accentColor,
    logo: branding?.logo ? "custom" : "dynamic",
    logoUrl: branding?.logo ?? null,
  });
}

export function extractFromRemittance(
  config: StoredRemittanceConfig,
): ExtractResult {
  return buildSeed({
    source: { kind: "remittance", id: config.id },
    ownerId: config.ownerId,
    name: config.name,
    description: config.description ?? null,
    primaryColor: config.config.theme?.primaryColor,
    accentColorFallback: config.config.theme?.secondaryColor,
    logo: config.config.branding?.logoUrl ? "custom" : "dynamic",
    logoUrl: config.config.branding?.logoUrl ?? null,
  });
}
