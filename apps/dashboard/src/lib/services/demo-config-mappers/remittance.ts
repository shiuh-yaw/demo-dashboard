/**
 * Remittance ↔ DemoConfig mapper. See `earn.ts` for the pattern.
 *
 * Remittance has historically been the most-themed demo type — both
 * primary and secondary colours drive the brand. We hash on
 * `(primaryColor, branding.logoUrl?)` to match the backfill's
 * derivation (secondaryColor is enriched onto the resolved Brand but
 * never participates in the id).
 */

import {
  DEFAULT_REMITTANCE_CONFIG,
  type RemittanceConfig,
  type StoredRemittanceConfig,
} from "@/lib/types/dashboard";

import { resolveBrand } from "./brand-resolver";
import type { DemoConfigMapper } from "./types";

const DEFAULT_PRIMARY = DEFAULT_REMITTANCE_CONFIG.theme!.primaryColor!;

function pickPrimary(c: Partial<RemittanceConfig> | undefined): string {
  return c?.theme?.primaryColor ?? DEFAULT_PRIMARY;
}

function pickLogoUrl(
  c: Partial<RemittanceConfig> | undefined,
): string | null {
  return c?.branding?.logoUrl ?? null;
}

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

  async toCreateInput(brands, input) {
    const merged = mergeConfig(DEFAULT_REMITTANCE_CONFIG, input.config);
    const brand = await resolveBrand(brands, {
      ownerId: input.ownerId,
      name: input.name || remittanceMapper.untitledLabel,
      primaryColor: pickPrimary(merged),
      logoUrl: pickLogoUrl(merged),
      extra: {
        secondaryColor: merged.theme?.secondaryColor ?? null,
      },
    });
    return {
      kind: remittanceMapper.kind,
      ownerId: input.ownerId,
      name: input.name && input.name.length > 0 ? input.name : null,
      description: input.description ?? null,
      brandId: brand.id,
      themeOverrides: null,
      config: merged as unknown as Record<string, unknown>,
    };
  },

  async toUpdateInput(brands, existing, input) {
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
    if (input.config) {
      update.config = mergedConfig;
      const newPrimary = pickPrimary(mergedConfig);
      const newLogoUrl = pickLogoUrl(mergedConfig);
      if (
        newPrimary !== pickPrimary(existingConfig) ||
        newLogoUrl !== pickLogoUrl(existingConfig)
      ) {
        const brand = await resolveBrand(brands, {
          ownerId: input.ownerId,
          name: input.name || remittanceMapper.untitledLabel,
          primaryColor: newPrimary,
          logoUrl: newLogoUrl,
          extra: {
            secondaryColor: mergedConfig.theme?.secondaryColor ?? null,
          },
        });
        update.brandId = brand.id;
      }
    }
    return update;
  },

  toStored(record, brand) {
    const config = record.config as RemittanceConfig | null | undefined;
    const hydratedTheme: RemittanceConfig["theme"] = brand
      ? {
          ...config?.theme,
          primaryColor: brand.primaryColor,
          primaryHoverColor: brand.primaryHoverColor ?? undefined,
          secondaryColor: brand.secondaryColor ?? config?.theme?.secondaryColor,
          accentColor: brand.accentColor ?? undefined,
          ...(record.themeOverrides as object | null | undefined),
        }
      : config?.theme;
    return {
      id: record.id,
      name: record.name ?? remittanceMapper.untitledLabel,
      description: record.description ?? undefined,
      ownerId: record.ownerId || undefined,
      config: {
        theme: hydratedTheme,
        branding: config?.branding,
      },
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  },
};
