/**
 * Remittance ↔ DemoConfig mapper. See `earn.ts` for the pattern.
 *
 * Remittance has historically been the most-themed demo type — both
 * primary and secondary colours drive the visual identity. `secondaryColor`
 * hydrates from the linked Prospect at read time (see `toStored`); it is
 * not part of prospect linkage itself.
 */

import {
  DEFAULT_REMITTANCE_CONFIG,
  type RemittanceConfig,
  type StoredRemittanceConfig,
} from "@/lib/types/dashboard";

import {
  hydrateProspectTheme,
  prospectDisplayFields,
  prospectLogoUrl,
} from "./prospect-hydration";
import type { DemoConfigMapper } from "./types";

function mergeConfig(
  base: RemittanceConfig,
  partial: Partial<RemittanceConfig> | undefined,
): RemittanceConfig {
  return {
    theme: { ...base.theme, ...partial?.theme },
    branding: { ...base.branding, ...partial?.branding },
  };
}

export const remittanceMapper: DemoConfigMapper<
  RemittanceConfig,
  StoredRemittanceConfig
> = {
  kind: "remittance",
  untitledLabel: "Untitled Remittance Config",

  async toCreateInput(_prospects, input) {
    const merged = mergeConfig(DEFAULT_REMITTANCE_CONFIG, input.config);
    return {
      kind: remittanceMapper.kind,
      ownerId: input.ownerId,
      createdById: input.createdById ?? null,
      name: input.name && input.name.length > 0 ? input.name : null,
      description: input.description ?? null,
      prospectId: input.prospectId,
      themeOverrides: null,
      config: merged as unknown as Record<string, unknown>,
    };
  },

  async toUpdateInput(_prospects, existing, input) {
    const existingConfig = existing.config as RemittanceConfig;
    const mergedConfig = input.config
      ? mergeConfig(existingConfig, input.config)
      : existingConfig;

    const update: Record<string, unknown> = {};
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
      update.config = mergedConfig;
    }
    return update;
  },

  toStored(record, prospect) {
    const config = record.config as RemittanceConfig | null | undefined;
    const baseTheme = hydrateProspectTheme(
      prospect,
      config?.theme,
      record.themeOverrides,
    );
    // Layer remittance-specific secondaryColor from the Prospect.
    const hydratedTheme: RemittanceConfig["theme"] = baseTheme
      ? {
          ...baseTheme,
          ...(prospect?.secondaryColor != null && {
            secondaryColor: prospect.secondaryColor,
          }),
        }
      : baseTheme;
    const logoUrl = prospectLogoUrl(prospect);
    return {
      id: record.id,
      name: record.name ?? remittanceMapper.untitledLabel,
      description: record.description ?? undefined,
      ownerId: record.ownerId || undefined,
      prospectId: record.prospectId,
      ...prospectDisplayFields(prospect),
      config: {
        theme: hydratedTheme,
        branding: {
          ...config?.branding,
          ...(logoUrl != null && { logoUrl }),
          // Prospect name titles the tab when the config doesn't set one
          // (matches the prospect-fallback synthesis path).
          ...(config?.branding?.appName == null &&
            prospect?.name != null && { appName: prospect.name }),
        },
      },
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  },
};
