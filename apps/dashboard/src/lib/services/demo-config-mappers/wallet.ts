/**
 * Wallet ↔ DemoConfig mapper. See `earn.ts` for the pattern.
 *
 * Wallet's branding stores the logo URL directly in `branding.logo`
 * (string), not via a `custom | dynamic` discriminator. Brand hash key
 * uses that URL as the `logoUrl` input.
 */

import {
  DEFAULT_WALLET_CONFIG,
  type StoredWalletConfig,
  type WalletConfig,
} from "@/lib/types/dashboard";

import { resolveBrand } from "./brand-resolver";
import type { DemoConfigMapper } from "./types";

const DEFAULT_PRIMARY = DEFAULT_WALLET_CONFIG.theme!.primaryColor!;

function pickPrimary(c: Partial<WalletConfig> | undefined): string {
  return c?.theme?.primaryColor ?? DEFAULT_PRIMARY;
}

function pickLogoUrl(c: Partial<WalletConfig> | undefined): string | null {
  const logo = c?.branding?.logo;
  return logo && logo.length > 0 ? logo : null;
}

function mergeConfig(
  base: WalletConfig,
  partial: Partial<WalletConfig> | undefined,
): WalletConfig {
  return {
    theme: { ...base.theme, ...partial?.theme },
    branding: {
      ...base.branding,
      ...partial?.branding,
      logo:
        partial?.branding?.logo ??
        base.branding?.logo ??
        DEFAULT_WALLET_CONFIG.branding!.logo,
    },
  };
}

export const walletMapper: DemoConfigMapper<WalletConfig, StoredWalletConfig> = {
  kind: "wallet",
  untitledLabel: "Untitled Wallet Config",

  async toCreateInput(brands, input) {
    const merged = mergeConfig(DEFAULT_WALLET_CONFIG, input.config);
    const brand = await resolveBrand(brands, {
      ownerId: input.ownerId,
      name: input.name || walletMapper.untitledLabel,
      primaryColor: pickPrimary(merged),
      logoUrl: pickLogoUrl(merged),
      extra: {
        accentColor: merged.theme?.accentColor ?? null,
      },
    });
    return {
      kind: walletMapper.kind,
      ownerId: input.ownerId,
      name: input.name && input.name.length > 0 ? input.name : null,
      description: input.description ?? null,
      brandId: brand.id,
      themeOverrides: null,
      config: merged as unknown as Record<string, unknown>,
    };
  },

  async toUpdateInput(brands, existing, input) {
    const existingConfig = existing.config as WalletConfig;
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
          name: input.name || walletMapper.untitledLabel,
          primaryColor: newPrimary,
          logoUrl: newLogoUrl,
          extra: {
            accentColor: mergedConfig.theme?.accentColor ?? null,
          },
        });
        update.brandId = brand.id;
      }
    }
    return update;
  },

  toStored(record, brand) {
    const config = record.config as WalletConfig | null | undefined;
    const hydratedTheme: WalletConfig["theme"] = brand
      ? {
          ...config?.theme,
          primaryColor: brand.primaryColor,
          primaryHoverColor: brand.primaryHoverColor ?? undefined,
          accentColor: brand.accentColor ?? undefined,
          ...(record.themeOverrides as object | null | undefined),
        }
      : config?.theme;
    return {
      id: record.id,
      name: record.name ?? walletMapper.untitledLabel,
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
