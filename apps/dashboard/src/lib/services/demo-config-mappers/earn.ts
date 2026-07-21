/**
 * Earn ↔ DemoConfig mapper.
 *
 * Inbound (action create/update): take the form's `EarnConfig` payload plus
 * the caller-supplied `prospectId` (explicit, GTM-03.5B - no hash-derived
 * auto-create), stash the whole config payload in `config: Json`.
 * `themeOverrides` is left null for now — the per-config-vs-prospect theme
 * diff calculation lands when stricter prospect-vs-config drift detection
 * is needed; today the embedded `config.theme` is the carrier and
 * `<ThemeStyleTag>` still reads from that path.
 *
 * Outbound (action read): hydrate the linked Prospect row (caller passes
 * the fetched Prospect to keep this module pure), then project back into
 * `StoredEarnConfig`. When the config is unbound or the legacy Redis
 * fallback surfaced a record without a Prospect row (`prospect === null`),
 * we preserve the legacy embedded theme from the `config` payload - no
 * theme is lost on the pre-cutover read path.
 */

import {
  DEFAULT_EARN_CONFIG,
  type EarnConfig,
  type StoredEarnConfig,
} from "@/lib/types/dashboard";

import {
  hydrateProspectTheme,
  prospectDisplayFields,
  prospectLogoUrl,
} from "./prospect-hydration";
import type { DemoConfigMapper } from "./types";

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

  async toCreateInput(_prospects, input) {
    const merged = mergeConfig(DEFAULT_EARN_CONFIG, input.config);
    return {
      kind: earnMapper.kind,
      ownerId: input.ownerId,
      createdById: input.createdById ?? null,
      // Empty-string name from the form maps to null in DB so the
      // "Untitled Earn Config" fallback path is exercised consistently.
      name: input.name && input.name.length > 0 ? input.name : null,
      description: input.description ?? null,
      prospectId: input.prospectId,
      themeOverrides: null,
      config: merged as unknown as Record<string, unknown>,
    };
  },

  async toUpdateInput(_prospects, existing, input) {
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
    if (input.prospectId !== undefined) {
      update.prospectId = input.prospectId;
    }
    if (input.config) {
      update.config = mergedConfig as unknown as Record<string, unknown>;
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
      prospectId: record.prospectId,
      ...prospectDisplayFields(prospect),
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
