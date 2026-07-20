/**
 * Earn ↔ DemoConfig mapper.
 *
 * Inbound (action create/update): take the form's `EarnConfig` payload,
 * derive a deterministic `prospectId` from `(ownerId, theme.primaryColor,
 * branding.logoUrl?)`, stash the whole config payload in `config: Json`.
 * `themeOverrides` is left null for now — the per-config-vs-prospect theme
 * diff calculation lands when stricter prospect-vs-config drift detection
 * is needed; today the embedded `config.theme` is the carrier and
 * `<ThemeStyleTag>` still reads from that path.
 *
 * Outbound (action read): hydrate the linked Prospect row (caller passes
 * the fetched Prospect to keep this module pure), then project back into
 * `StoredEarnConfig`. When the legacy Redis fallback surfaced a record
 * without a Prospect row (`prospect === null`), we preserve the legacy
 * embedded theme from the `config` payload — no theme is lost on the
 * pre-cutover read path.
 */

import {
  DEFAULT_EARN_CONFIG,
  type EarnConfig,
  type StoredEarnConfig,
} from "@/lib/types/dashboard";

import { resolveProspect } from "./prospect-resolver";
import { hydrateProspectTheme, prospectLogoUrl } from "./prospect-hydration";
import type { DemoConfigMapper } from "./types";

const DEFAULT_PRIMARY = DEFAULT_EARN_CONFIG.theme!.primaryColor!;

function pickPrimary(config: Partial<EarnConfig> | undefined): string {
  return config?.theme?.primaryColor ?? DEFAULT_PRIMARY;
}

function pickLogoUrl(config: Partial<EarnConfig> | undefined): string | null {
  const branding = config?.branding;
  if (!branding) return null;
  return branding.logo === "custom" && branding.logoUrl
    ? branding.logoUrl
    : null;
}

/**
 * Merge a default config with the inbound partial — same merge rules as
 * the legacy `createEarnConfig` / `updateEarnConfig` actions had inline,
 * just lifted into the mapper so the action file stays thin.
 */
function mergeConfig(
  base: EarnConfig,
  partial: Partial<EarnConfig> | undefined,
): EarnConfig {
  return {
    theme: { ...base.theme, ...partial?.theme },
    branding: {
      ...base.branding,
      ...partial?.branding,
      // 'logo' is required on the branding shape — fall through nullishly.
      logo:
        partial?.branding?.logo ??
        base.branding?.logo ??
        DEFAULT_EARN_CONFIG.branding!.logo,
    },
    layout: { ...base.layout, ...partial?.layout },
  };
}

export const earnMapper: DemoConfigMapper<EarnConfig, StoredEarnConfig> = {
  kind: "earn",
  untitledLabel: "Untitled Earn Config",

  async toCreateInput(prospects, input) {
    const merged = mergeConfig(DEFAULT_EARN_CONFIG, input.config);
    const primary = merged.theme?.primaryColor ?? DEFAULT_PRIMARY;
    const logoUrl = pickLogoUrl(merged);
    const prospect = await resolveProspect(prospects, {
      ownerId: input.ownerId,
      // Use the demo's name as a sensible default for the prospect label
      // on first upsert. Subsequent demos sharing the same prospect keep
      // the existing prospect's name.
      name: input.name || earnMapper.untitledLabel,
      primaryColor: primary,
      logoUrl,
      extra: {
        accentColor: merged.theme?.accentColor ?? null,
      },
    });
    return {
      kind: earnMapper.kind,
      ownerId: input.ownerId,
      // Empty-string name from the form maps to null in DB so the
      // "Untitled Earn Config" fallback path is exercised consistently.
      name: input.name && input.name.length > 0 ? input.name : null,
      description: input.description ?? null,
      prospectId: prospect.id,
      themeOverrides: null,
      config: merged as unknown as Record<string, unknown>,
    };
  },

  async toUpdateInput(prospects, existing, input) {
    const existingConfig = existing.config as EarnConfig;
    const mergedConfig = input.config
      ? mergeConfig(existingConfig, input.config)
      : existingConfig;

    const update: ReturnType<
      DemoConfigMapper<EarnConfig, StoredEarnConfig>["toUpdateInput"]
    > extends Promise<infer T>
      ? T
      : never = {};

    if (input.name !== undefined) {
      update.name =
        input.name && input.name.length > 0 ? input.name : null;
    }
    if (input.description !== undefined) {
      update.description = input.description ?? null;
    }
    if (input.config) {
      update.config = mergedConfig as unknown as Record<string, unknown>;
      // Theme changed → re-resolve Prospect. We always recompute the prospect
      // here (not just when primaryColor changed) so partial updates
      // that swap logo / make a custom→dynamic transition land cleanly.
      const newPrimary = pickPrimary(mergedConfig);
      const newLogoUrl = pickLogoUrl(mergedConfig);
      const existingPrimary = pickPrimary(existingConfig);
      const existingLogoUrl = pickLogoUrl(existingConfig);
      if (
        newPrimary !== existingPrimary ||
        newLogoUrl !== existingLogoUrl
      ) {
        const prospect = await resolveProspect(prospects, {
          ownerId: input.ownerId,
          name: input.name || earnMapper.untitledLabel,
          primaryColor: newPrimary,
          logoUrl: newLogoUrl,
          extra: {
            accentColor: mergedConfig.theme?.accentColor ?? null,
          },
        });
        update.prospectId = prospect.id;
      }
    }
    return update;
  },

  toStored(record, prospect) {
    const config = record.config as EarnConfig | null | undefined;
    const hydratedTheme = hydrateProspectTheme(
      prospect,
      config?.theme,
      record.themeOverrides,
    );
    const logoUrl = prospectLogoUrl(prospect);
    return {
      id: record.id,
      name: record.name ?? earnMapper.untitledLabel,
      description: record.description ?? undefined,
      ownerId: record.ownerId || undefined,
      config: {
        theme: hydratedTheme,
        branding: {
          ...config?.branding,
          logo: (prospect?.logo ?? config?.branding?.logo ?? "dynamic") as import("@/lib/types/dashboard").EarnBrand,
          ...(logoUrl != null && { logoUrl }),
        },
        layout: config?.layout,
      },
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  },
};
