/**
 * Bidirectional mapping between the legacy `BrandProfile` aggregate
 * (Redis-only shape exposed to the dashboard's server actions and to
 * `/api/brands/[id]`) and the canonical `Brand` row that
 * `BrandService` returns.
 *
 * Phase 2-brand-cutover (2026-05-06): the legacy aggregate now derives
 * from `BrandService` reads; the demos sub-object continues to
 * reference Redis-resident demo configs (Earn, Wallet, Checkout,
 * Remittance) that haven't migrated to Postgres yet.
 *
 * The two shapes are field-for-field equivalent on the brand row
 * itself; only the nested vs flat layout differs. This module is the
 * single canonical translator so consumers see one shape per surface.
 */

import type {
  BrandDemos,
  BrandProfile,
  BrandSettings,
  BrandTheme,
  CreateBrandProfileRequest,
  UpdateBrandProfileRequest,
} from "@/lib/types/dashboard";
import { DEFAULT_BRAND_SETTINGS } from "@/lib/types/dashboard";

import type {
  Brand,
  BrandLogoKind,
  CreateBrandInput,
  UpdateBrandInput,
} from "./types";

/**
 * Project a Brand row into the legacy BrandProfile aggregate. Demo-
 * config ids stay on the row; we surface them through `demos` so
 * consumers (BrandEditor, BrandsClient, /api/brands/[id]) keep the
 * same shape they had before the cutover.
 */
export function brandToProfile(brand: Brand): BrandProfile {
  const theme: BrandTheme = {
    primaryColor: brand.primaryColor,
    primaryHoverColor: brand.primaryHoverColor ?? undefined,
    accentColor: brand.accentColor ?? undefined,
    pageBackground: brand.pageBackground ?? undefined,
    background: brand.background ?? undefined,
    foreground: brand.foreground ?? undefined,
    mutedTextColor: brand.mutedTextColor ?? undefined,
    borderColor: brand.borderColor ?? undefined,
    rowBackground: brand.rowBackground ?? undefined,
    rowHoverBackground: brand.rowHoverBackground ?? undefined,
    gradientFrom: brand.gradientFrom ?? undefined,
    gradientTo: brand.gradientTo ?? undefined,
    borderRadius: brand.borderRadius ?? undefined,
  };
  const settings: BrandSettings = {
    logo: brand.logo,
    logoUrl: brand.logoUrl ?? undefined,
    primaryColor: brand.primaryColor,
    accentColor: brand.accentColor ?? undefined,
    borderRadius: brand.borderRadius ?? undefined,
    theme,
  };
  const demos: BrandDemos = {};
  if (brand.demoEarnId) demos.earn = brand.demoEarnId;
  if (brand.demoCheckoutsId) demos.checkouts = brand.demoCheckoutsId;
  if (brand.demoWalletId) demos.wallet = brand.demoWalletId;
  if (brand.demoRemittanceId) demos.remittance = brand.demoRemittanceId;
  return {
    id: brand.id,
    name: brand.name,
    companyUrl: brand.companyUrl ?? undefined,
    brand: settings,
    demos,
    ownerId: brand.ownerId,
    createdAt: brand.createdAt.toISOString(),
    updatedAt: brand.updatedAt.toISOString(),
  };
}

/**
 * Build a `CreateBrandInput` from a legacy `CreateBrandProfileRequest`.
 * Demo-config ids are filled in by the caller after the linked configs
 * are created (see actions/brands.ts).
 */
export function createRequestToInput(
  ownerId: string,
  request: CreateBrandProfileRequest,
): CreateBrandInput {
  // Merge with defaults so the row is always populated. The caller's
  // BrandSettings overlay wins where present.
  const merged: BrandSettings = {
    ...DEFAULT_BRAND_SETTINGS,
    ...request.brand,
  };
  const theme: Partial<BrandTheme> = merged.theme ?? {};
  return {
    ownerId,
    name: request.name || "Untitled Brand",
    description: null,
    companyUrl: request.companyUrl ?? null,
    logo: merged.logo,
    logoUrl: merged.logoUrl ?? null,
    borderRadius: merged.borderRadius ?? theme.borderRadius ?? null,
    primaryColor: theme.primaryColor ?? merged.primaryColor,
    primaryHoverColor: theme.primaryHoverColor ?? null,
    secondaryColor: null,
    accentColor: theme.accentColor ?? merged.accentColor ?? null,
    pageBackground: theme.pageBackground ?? null,
    background: theme.background ?? null,
    foreground: theme.foreground ?? null,
    mutedTextColor: theme.mutedTextColor ?? null,
    borderColor: theme.borderColor ?? null,
    rowBackground: theme.rowBackground ?? null,
    rowHoverBackground: theme.rowHoverBackground ?? null,
    gradientFrom: theme.gradientFrom ?? null,
    gradientTo: theme.gradientTo ?? null,
    demoEarnId: null,
    demoCheckoutsId: null,
    demoWalletId: null,
    demoRemittanceId: null,
  };
}

/**
 * Build an `UpdateBrandInput` from a legacy `UpdateBrandProfileRequest`.
 * Existing demo-config ids on the row are preserved unless the caller
 * mutates them through the demo orchestration helpers in actions/brands.ts.
 */
export function updateRequestToInput(
  request: UpdateBrandProfileRequest,
): UpdateBrandInput {
  const data: UpdateBrandInput = {};
  if (request.name !== undefined) data.name = request.name;
  if (request.companyUrl !== undefined) {
    data.companyUrl = request.companyUrl ?? null;
  }
  if (request.brand) {
    const settings = request.brand;
    if (settings.logo !== undefined) {
      data.logo = settings.logo as BrandLogoKind;
    }
    if (settings.logoUrl !== undefined) {
      data.logoUrl = settings.logoUrl ?? null;
    }
    if (settings.primaryColor !== undefined) {
      data.primaryColor = settings.primaryColor;
    }
    if (settings.accentColor !== undefined) {
      data.accentColor = settings.accentColor ?? null;
    }
    if (settings.borderRadius !== undefined) {
      data.borderRadius = settings.borderRadius ?? null;
    }
    const theme = settings.theme;
    if (theme) {
      if (theme.primaryColor !== undefined) {
        data.primaryColor = theme.primaryColor;
      }
      if (theme.primaryHoverColor !== undefined) {
        data.primaryHoverColor = theme.primaryHoverColor ?? null;
      }
      if (theme.accentColor !== undefined) {
        data.accentColor = theme.accentColor ?? null;
      }
      if (theme.pageBackground !== undefined) {
        data.pageBackground = theme.pageBackground ?? null;
      }
      if (theme.background !== undefined) {
        data.background = theme.background ?? null;
      }
      if (theme.foreground !== undefined) {
        data.foreground = theme.foreground ?? null;
      }
      if (theme.mutedTextColor !== undefined) {
        data.mutedTextColor = theme.mutedTextColor ?? null;
      }
      if (theme.borderColor !== undefined) {
        data.borderColor = theme.borderColor ?? null;
      }
      if (theme.rowBackground !== undefined) {
        data.rowBackground = theme.rowBackground ?? null;
      }
      if (theme.rowHoverBackground !== undefined) {
        data.rowHoverBackground = theme.rowHoverBackground ?? null;
      }
      if (theme.gradientFrom !== undefined) {
        data.gradientFrom = theme.gradientFrom ?? null;
      }
      if (theme.gradientTo !== undefined) {
        data.gradientTo = theme.gradientTo ?? null;
      }
      if (theme.borderRadius !== undefined) {
        data.borderRadius = theme.borderRadius ?? null;
      }
    }
  }
  return data;
}

/** Build the demo-id slice of an `UpdateBrandInput` from a `BrandDemos`. */
export function demosToUpdateInput(demos: BrandDemos): UpdateBrandInput {
  return {
    demoEarnId: demos.earn ?? null,
    demoCheckoutsId: demos.checkouts ?? null,
    demoWalletId: demos.wallet ?? null,
    demoRemittanceId: demos.remittance ?? null,
  };
}
