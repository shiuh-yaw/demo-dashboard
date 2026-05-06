/**
 * Pure functions that normalise legacy records into BrandSeed values.
 * Each extractor is total — invalid input returns null + an emitted
 * "skipped" record that the orchestrator surfaces in the report.
 */

import type {
  BrandProfile,
  StoredEarnConfig,
  StoredWalletConfig,
  StoredCheckoutConfig,
  StoredRemittanceConfig,
} from "@/lib/types/dashboard";
import { isHexColor, normaliseHex } from "./hash";
import type { BrandSeed, BrandSource } from "./types";

export interface ExtractResult {
  seed: BrandSeed | null;
  /** Populated when `seed` is null. Surfaced as `reason` in the report. */
  skipReason?: string;
}

function buildSeed(args: {
  source: BrandSource;
  ownerId: string | undefined;
  name: string;
  description?: string | null;
  primaryColor: unknown;
  accentColor?: unknown;
  secondaryColor?: unknown;
  logoUrl?: string | null;
}): ExtractResult {
  if (!args.ownerId) {
    return { seed: null, skipReason: "missing ownerId" };
  }
  if (!isHexColor(args.primaryColor)) {
    return {
      seed: null,
      skipReason: `invalid primaryColor (${typeof args.primaryColor})`,
    };
  }
  return {
    seed: {
      source: args.source,
      ownerId: args.ownerId,
      name: args.name,
      description: args.description ?? null,
      primaryColor: normaliseHex(args.primaryColor),
      accentColor: isHexColor(args.accentColor)
        ? normaliseHex(args.accentColor as string)
        : null,
      secondaryColor: isHexColor(args.secondaryColor)
        ? normaliseHex(args.secondaryColor as string)
        : null,
      logoUrl: args.logoUrl ?? null,
    },
  };
}

export function extractFromBrandProfile(
  profile: BrandProfile,
): ExtractResult {
  const themePrimary = profile.brand.theme?.primaryColor;
  const settingsPrimary = profile.brand.primaryColor;
  // Theme overlay wins when present, else convenience accessor.
  const primary = themePrimary ?? settingsPrimary;
  const accent = profile.brand.theme?.accentColor ?? profile.brand.accentColor;
  const logoUrl =
    profile.brand.logo === "custom" && profile.brand.logoUrl
      ? profile.brand.logoUrl
      : null;
  return buildSeed({
    source: { kind: "brand-profile", id: profile.id },
    ownerId: profile.ownerId,
    name: profile.name,
    description: null,
    primaryColor: primary,
    accentColor: accent,
    logoUrl,
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
    accentColor: config.config.theme?.accentColor,
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
    accentColor: config.config.theme?.accentColor,
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
    accentColor: theme?.accentColor,
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
    accentColor: config.config.theme?.secondaryColor,
    logoUrl: config.config.branding?.logoUrl ?? null,
  });
}
