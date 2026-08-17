/**
 * Background brand-theme import for a prospect, shared by both creation
 * paths: the operator-created prospect (`createProspectProfile`) and the
 * auto-created one from an inbound lead (`ensureProspectForDomain`). Only
 * the first had it, so every auto-created company sat on default blue.
 *
 * Best-effort by contract: a prospect without branding is still a valid
 * prospect, so every failure is logged and swallowed.
 */

import { extractThemeFromUrl } from "@/lib/actions/extract-theme";
import { normalizeLogoUrl } from "@/lib/normalize-logo";
import type { UpdateProspectInput } from "@/lib/services/types";
import type { WidgetTheme, WidgetBranding } from "@/lib/widget-config";

/**
 * Map an `extractThemeFromUrl` result onto a prospect-row update: derived
 * logo (normalized, best-effort) plus every color/radius token the extractor
 * returned. Only defined fields are written so a partial extraction never
 * blanks existing columns.
 */
export async function extractedToProspectUpdate(data: {
  theme: Partial<WidgetTheme>;
  branding: Partial<WidgetBranding>;
}): Promise<UpdateProspectInput> {
  const t = data.theme;
  const update: UpdateProspectInput = {};
  const logo = data.branding.logo;
  if (logo) {
    update.logo = "custom";
    update.logoUrl = await normalizeLogoUrl(logo);
  }
  const set = (key: keyof UpdateProspectInput, value: string | undefined) => {
    if (value) (update as Record<string, unknown>)[key] = value;
  };
  set("primaryColor", t.primaryColor);
  set("primaryHoverColor", t.primaryHoverColor);
  set("accentColor", t.accentColor);
  set("pageBackground", t.pageBackground);
  set("background", t.background);
  set("foreground", t.foreground);
  set("mutedTextColor", t.mutedTextColor);
  set("borderColor", t.borderColor);
  set("rowBackground", t.rowBackground);
  set("rowHoverBackground", t.rowHoverBackground);
  set("gradientFrom", t.gradientFrom);
  set("gradientTo", t.gradientTo);
  set("borderRadius", t.borderRadius);
  return update;
}

export interface ImportProspectThemeDeps {
  update(id: string, input: UpdateProspectInput): Promise<unknown>;
  revalidate?: (path: string) => void;
  logger?: { error(line: string, err?: unknown): void };
}

/**
 * Resolve branding for `website` and write it onto the prospect row.
 * Returns whether anything was written, so callers can log a no-op run
 * distinctly from a failure.
 */
export async function importProspectTheme(
  prospectId: string,
  website: string,
  deps: ImportProspectThemeDeps,
): Promise<boolean> {
  try {
    const res = await extractThemeFromUrl(website);
    if (!res.success || !res.data) {
      deps.logger?.error(
        `[prospect-theme] extraction returned no data for ${website}: ${res.error ?? "unknown"}`,
      );
      return false;
    }
    const update = await extractedToProspectUpdate(res.data);
    if (Object.keys(update).length === 0) return false;
    await deps.update(prospectId, update);
    deps.revalidate?.("/dashboard");
    deps.revalidate?.(`/dashboard/prospects/${prospectId}`);
    return true;
  } catch (err) {
    deps.logger?.error("[prospect-theme] background import failed", err);
    return false;
  }
}
