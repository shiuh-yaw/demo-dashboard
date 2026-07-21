/**
 * Visa Direct ↔ DemoConfig mapper. See `earn.ts` for the pattern.
 *
 * Visa Direct's theme has a single prospect-defining colour (`primaryColor`);
 * the rest is constrained to the dashboard's neutral palette.
 */

import {
  DEFAULT_VISA_DIRECT_CONFIG,
  type StoredVisaDirectConfig,
  type VisaDirectConfig,
} from "@/lib/types/dashboard";

import {
  hydrateProspectTheme,
  prospectDisplayFields,
  prospectLogoUrl,
} from "./prospect-hydration";
import type { DemoConfigMapper } from "./types";

function mergeConfig(
  base: VisaDirectConfig,
  partial: Partial<VisaDirectConfig> | undefined,
): VisaDirectConfig {
  return {
    branding: { ...base.branding, ...partial?.branding },
    theme: { ...base.theme, ...partial?.theme },
  };
}

export const visaDirectMapper: DemoConfigMapper<
  VisaDirectConfig,
  StoredVisaDirectConfig
> = {
  kind: "visa-direct",
  untitledLabel: "Untitled Visa Direct Config",

  async toCreateInput(_prospects, input) {
    const merged = mergeConfig(DEFAULT_VISA_DIRECT_CONFIG, input.config);
    return {
      kind: visaDirectMapper.kind,
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
    const existingConfig = existing.config as VisaDirectConfig;
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
    const config = record.config as VisaDirectConfig | null | undefined;
    const hydratedTheme: VisaDirectConfig["theme"] = hydrateProspectTheme(
      prospect,
      config?.theme,
      record.themeOverrides,
    ) ?? (config?.theme ?? DEFAULT_VISA_DIRECT_CONFIG.theme);
    const logoUrl = prospectLogoUrl(prospect);
    return {
      id: record.id,
      name: record.name ?? visaDirectMapper.untitledLabel,
      description: record.description ?? undefined,
      ownerId: record.ownerId || undefined,
      prospectId: record.prospectId,
      ...prospectDisplayFields(prospect),
      config: {
        branding: {
          ...(config?.branding ?? DEFAULT_VISA_DIRECT_CONFIG.branding),
          ...(logoUrl != null && { logoUrl }),
        },
        theme: hydratedTheme,
      },
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  },
};
