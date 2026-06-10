/**
 * Visa Direct ↔ DemoConfig mapper. See `earn.ts` for the pattern.
 *
 * Visa Direct's theme has a single brand-defining colour (`primaryColor`);
 * the rest is constrained to the dashboard's neutral palette. Brand
 * hashing uses `(primaryColor, branding.logoUrl?)`.
 */

import {
  DEFAULT_VISA_DIRECT_CONFIG,
  type StoredVisaDirectConfig,
  type VisaDirectConfig,
} from "@/lib/types/dashboard";

import { resolveBrand } from "./brand-resolver";
import { hydrateBrandTheme, brandLogoUrl } from "./brand-hydration";
import type { DemoConfigMapper } from "./types";

const DEFAULT_PRIMARY = DEFAULT_VISA_DIRECT_CONFIG.theme.primaryColor!;

function pickPrimary(c: Partial<VisaDirectConfig> | undefined): string {
  return c?.theme?.primaryColor ?? DEFAULT_PRIMARY;
}

function pickLogoUrl(
  c: Partial<VisaDirectConfig> | undefined,
): string | null {
  return c?.branding?.logoUrl ?? null;
}

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

  async toCreateInput(brands, input) {
    const merged = mergeConfig(DEFAULT_VISA_DIRECT_CONFIG, input.config);
    const brand = await resolveBrand(brands, {
      ownerId: input.ownerId,
      name: input.name || visaDirectMapper.untitledLabel,
      primaryColor: pickPrimary(merged),
      logoUrl: pickLogoUrl(merged),
    });
    return {
      kind: visaDirectMapper.kind,
      ownerId: input.ownerId,
      name: input.name && input.name.length > 0 ? input.name : null,
      description: input.description ?? null,
      brandId: brand.id,
      themeOverrides: null,
      config: merged as unknown as Record<string, unknown>,
    };
  },

  async toUpdateInput(brands, existing, input) {
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
          name: input.name || visaDirectMapper.untitledLabel,
          primaryColor: newPrimary,
          logoUrl: newLogoUrl,
        });
        update.brandId = brand.id;
      }
    }
    return update;
  },

  toStored(record, brand) {
    const config = record.config as VisaDirectConfig | null | undefined;
    const hydratedTheme: VisaDirectConfig["theme"] = hydrateBrandTheme(
      brand,
      config?.theme,
      record.themeOverrides,
    ) ?? (config?.theme ?? DEFAULT_VISA_DIRECT_CONFIG.theme);
    const logoUrl = brandLogoUrl(brand);
    return {
      id: record.id,
      name: record.name ?? visaDirectMapper.untitledLabel,
      description: record.description ?? undefined,
      ownerId: record.ownerId || undefined,
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
