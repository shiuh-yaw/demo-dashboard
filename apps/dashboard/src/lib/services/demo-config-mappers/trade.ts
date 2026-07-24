/**
 * Trade ↔ DemoConfig mapper. See `earn.ts` for the pattern.
 *
 * Trade's TS type has no `theme` field on `TradeConfig` — the legacy
 * stored shape only carries `branding`. But the dashboard's
 * trade-config form has historically allowed setting theme fields and
 * stored them inside the opaque `config` field.
 */

import {
  DEFAULT_TRADE_CONFIG,
  type StoredTradeConfig,
  type TradeConfig,
} from "@/lib/types/dashboard";

import {
  hydrateProspectTheme,
  prospectDisplayFields,
  prospectLogoUrl,
} from "./prospect-hydration";
import type { DemoConfigMapper } from "./types";

function mergeConfig(
  base: TradeConfig,
  partial: Partial<TradeConfig> | undefined,
): TradeConfig {
  const merged: TradeConfig = {
    branding: { ...base.branding, ...partial?.branding },
  };
  // Preserve any non-standard theme key the form stashed on `config`.
  const baseTheme = (base as { theme?: unknown }).theme;
  const partialTheme = (partial as { theme?: unknown } | undefined)?.theme;
  if (baseTheme || partialTheme) {
    (merged as Record<string, unknown>).theme = {
      ...(baseTheme as object | null | undefined),
      ...(partialTheme as object | null | undefined),
    };
  }
  return merged;
}

export const tradeMapper: DemoConfigMapper<TradeConfig, StoredTradeConfig> = {
  kind: "trade",
  untitledLabel: "Untitled Trade Config",

  async toCreateInput(_prospects, input) {
    const merged = mergeConfig(DEFAULT_TRADE_CONFIG, input.config);
    return {
      kind: tradeMapper.kind,
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
    const existingConfig = existing.config as TradeConfig;
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
    const config = record.config as TradeConfig | null | undefined;
    const configTheme = (config as { theme?: Record<string, unknown> } | null | undefined)?.theme;
    const hydratedTheme = hydrateProspectTheme(
      prospect,
      configTheme,
      record.themeOverrides,
    );
    const logoUrl = prospectLogoUrl(prospect);
    return {
      id: record.id,
      name: record.name ?? tradeMapper.untitledLabel,
      description: record.description ?? undefined,
      ownerId: record.ownerId || undefined,
      prospectId: record.prospectId,
      ...prospectDisplayFields(prospect),
      config: prospect
        ? ({
            ...config,
            branding: {
              ...config?.branding,
              ...(logoUrl != null
                ? { logoUrl }
                : prospect.logoUrl != null
                  ? { logoUrl: prospect.logoUrl }
                  : {}),
              ...(config?.branding?.appName == null &&
                prospect.name != null && { appName: prospect.name }),
            },
            theme: hydratedTheme,
          } as TradeConfig)
        : (config ?? DEFAULT_TRADE_CONFIG),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  },
};
