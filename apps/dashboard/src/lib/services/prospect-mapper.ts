/**
 * Bidirectional mapping between the legacy `ProspectProfile` aggregate
 * (exposed to the dashboard's server actions and to `/api/prospects/[id]`)
 * and the canonical `Prospect` row that `ProspectService` returns.
 *
 * Demo-config ids are no longer carried on the `Prospect` row - they are
 * resolved from `DemoConfig.prospectId` (see `./prospect-demos.ts`,
 * `resolveProspectDemos` / `resolveProspectDemosBatch`). `prospectToProfile`
 * only projects the row's own columns; callers that need `demos` populated
 * merge the resolver's result in afterward.
 *
 * The two shapes are field-for-field equivalent on the prospect row
 * itself; only the nested vs flat layout differs. This module is the
 * single canonical translator so consumers see one shape per surface.
 */

import type {
  ProspectProfile,
  ProspectSettings,
  ProspectTheme,
  CreateProspectProfileRequest,
  UpdateProspectProfileRequest,
} from "@/lib/types/dashboard";
import { DEFAULT_PROSPECT_SETTINGS } from "@/lib/types/dashboard";

import type {
  Prospect,
  ProspectLogoKind,
  CreateProspectInput,
  UpdateProspectInput,
} from "./types";

/**
 * Project a Prospect row into the legacy ProspectProfile aggregate.
 * `demos` is always empty here - it is not a row column. Callers that
 * need it populated call `resolveProspectDemos`/`resolveProspectDemosBatch`
 * and merge the result onto the returned profile.
 */
export function prospectToProfile(prospect: Prospect): ProspectProfile {
  const theme: ProspectTheme = {
    primaryColor: prospect.primaryColor,
    primaryHoverColor: prospect.primaryHoverColor ?? undefined,
    accentColor: prospect.accentColor ?? undefined,
    pageBackground: prospect.pageBackground ?? undefined,
    background: prospect.background ?? undefined,
    foreground: prospect.foreground ?? undefined,
    mutedTextColor: prospect.mutedTextColor ?? undefined,
    borderColor: prospect.borderColor ?? undefined,
    rowBackground: prospect.rowBackground ?? undefined,
    rowHoverBackground: prospect.rowHoverBackground ?? undefined,
    gradientFrom: prospect.gradientFrom ?? undefined,
    gradientTo: prospect.gradientTo ?? undefined,
    borderRadius: prospect.borderRadius ?? undefined,
  };
  const settings: ProspectSettings = {
    logo: prospect.logo,
    logoUrl: prospect.logoUrl ?? undefined,
    primaryColor: prospect.primaryColor,
    accentColor: prospect.accentColor ?? undefined,
    borderRadius: prospect.borderRadius ?? undefined,
    theme,
  };
  return {
    id: prospect.id,
    name: prospect.name,
    companyUrl: prospect.companyUrl ?? undefined,
    prospect: settings,
    demos: {},
    ownerId: prospect.ownerId ?? undefined,
    createdById: prospect.createdById,
    teamId: prospect.teamId,
    createdAt: prospect.createdAt.toISOString(),
    updatedAt: prospect.updatedAt.toISOString(),
  };
}

/**
 * Build a `CreateProspectInput` from a legacy `CreateProspectProfileRequest`.
 * Demo-config ids are filled in by the caller after the linked configs
 * are created (see actions/prospects.ts).
 */
export function createRequestToInput(
  ownerId: string,
  createdById: string | null,
  request: CreateProspectProfileRequest,
): CreateProspectInput {
  // Merge with defaults so the row is always populated. The caller's
  // ProspectSettings overlay wins where present.
  const merged: ProspectSettings = {
    ...DEFAULT_PROSPECT_SETTINGS,
    ...request.prospect,
  };
  const theme: Partial<ProspectTheme> = merged.theme ?? {};
  return {
    ownerId,
    createdById,
    name: request.name || "Untitled Prospect",
    description: null,
    domain: null,
    notes: null,
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
  };
}

/**
 * Build an `UpdateProspectInput` from a legacy `UpdateProspectProfileRequest`.
 * Existing demo-config ids on the row are preserved unless the caller
 * mutates them through the demo orchestration helpers in actions/prospects.ts.
 */
export function updateRequestToInput(
  request: UpdateProspectProfileRequest,
): UpdateProspectInput {
  const data: UpdateProspectInput = {};
  if (request.name !== undefined) data.name = request.name;
  if (request.companyUrl !== undefined) {
    data.companyUrl = request.companyUrl ?? null;
  }
  if (request.prospect) {
    const settings = request.prospect;
    if (settings.logo !== undefined) {
      data.logo = settings.logo as ProspectLogoKind;
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
