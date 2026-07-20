/**
 * Wallet ↔ DemoConfig mapper. See `earn.ts` for the pattern.
 *
 * Wallet's branding stores the logo URL directly in `branding.logo`
 * (string), not via a `custom | dynamic` discriminator. Prospect hash key
 * uses that URL as the `logoUrl` input.
 */

import {
  DEFAULT_WALLET_CONFIG,
  type StoredWalletConfig,
  type WalletConfig,
} from "@/lib/types/dashboard";

import { resolveProspect } from "./prospect-resolver";
import { hydrateProspectTheme, prospectLogoUrl } from "./prospect-hydration";
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

  async toCreateInput(prospects, input) {
    const merged = mergeConfig(DEFAULT_WALLET_CONFIG, input.config);
    const prospect = await resolveProspect(prospects, {
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
      prospectId: prospect.id,
      themeOverrides: null,
      config: merged as unknown as Record<string, unknown>,
    };
  },

  async toUpdateInput(prospects, existing, input) {
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
        const prospect = await resolveProspect(prospects, {
          ownerId: input.ownerId,
          name: input.name || walletMapper.untitledLabel,
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
    const config = record.config as WalletConfig | null | undefined;
    const hydratedTheme = hydrateProspectTheme(
      prospect,
      config?.theme as Record<string, unknown> | undefined,
      record.themeOverrides,
      { foregroundKey: "foreground" },
    );
    const logoUrl = prospectLogoUrl(prospect);
    return {
      id: record.id,
      name: record.name ?? walletMapper.untitledLabel,
      description: record.description ?? undefined,
      ownerId: record.ownerId || undefined,
      config: {
        theme: hydratedTheme,
        branding: {
          ...config?.branding,
          ...(logoUrl != null && { logo: logoUrl }),
        },
      },
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  },
};
