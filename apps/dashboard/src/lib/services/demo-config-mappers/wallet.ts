/**
 * Wallet ↔ DemoConfig mapper. See `earn.ts` for the pattern.
 *
 * Wallet's branding stores the logo URL directly in `branding.logo`
 * (string), not via a `custom | dynamic` discriminator.
 */

import {
  DEFAULT_WALLET_CONFIG,
  type StoredWalletConfig,
  type WalletConfig,
} from "@/lib/types/dashboard";

import {
  hydrateProspectTheme,
  prospectDisplayFields,
  prospectLogoUrl,
} from "./prospect-hydration";
import type { DemoConfigMapper } from "./types";

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

  async toCreateInput(_prospects, input) {
    const merged = mergeConfig(DEFAULT_WALLET_CONFIG, input.config);
    return {
      kind: walletMapper.kind,
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
    if (input.prospectId !== undefined) {
      update.prospectId = input.prospectId;
    }
    if (input.config) {
      update.config = mergedConfig;
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
      prospectId: record.prospectId,
      ...prospectDisplayFields(prospect),
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
