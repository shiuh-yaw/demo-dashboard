/**
 * Trade ↔ DemoConfig mapper. See `earn.ts` for the pattern.
 *
 * Trade's TS type has no `theme` field on `TradeConfig` — the legacy
 * stored shape only carries `branding`. But the dashboard's
 * trade-config form has historically allowed setting theme fields and
 * stored them inside the opaque `config` field (see
 * `scripts/backfill-demo-configs/run.ts` for the equivalent
 * fallback). So we cast through `Record<string, unknown>` to find any
 * embedded theme.primaryColor; if absent, fall back to a neutral
 * dynamic-blue default for prospect resolution only.
 */

import {
  DEFAULT_TRADE_CONFIG,
  type StoredTradeConfig,
  type TradeConfig,
} from "@/lib/types/dashboard";

import { resolveProspect } from "./prospect-resolver";
import { hydrateProspectTheme, prospectLogoUrl } from "./prospect-hydration";
import type { DemoConfigMapper } from "./types";

// Neutral fallback when no theme is supplied. Matches the dashboard's
// historical default for prospect-less Trade demos.
const FALLBACK_PRIMARY = "#4779FF";

function extractPrimary(c: Partial<TradeConfig> | undefined): string {
  const theme = (c as { theme?: { primaryColor?: string } })?.theme;
  return theme?.primaryColor ?? FALLBACK_PRIMARY;
}

function extractLogoUrl(
  c: Partial<TradeConfig> | undefined,
): string | null {
  return c?.branding?.logoUrl ?? null;
}

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

  async toCreateInput(prospects, input) {
    const merged = mergeConfig(DEFAULT_TRADE_CONFIG, input.config);
    const prospect = await resolveProspect(prospects, {
      ownerId: input.ownerId,
      name: input.name || tradeMapper.untitledLabel,
      primaryColor: extractPrimary(merged),
      logoUrl: extractLogoUrl(merged),
    });
    return {
      kind: tradeMapper.kind,
      ownerId: input.ownerId,
      name: input.name && input.name.length > 0 ? input.name : null,
      description: input.description ?? null,
      prospectId: prospect.id,
      themeOverrides: null,
      config: merged as unknown as Record<string, unknown>,
    };
  },

  async toUpdateInput(prospects, existing, input) {
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
    if (input.config) {
      update.config = mergedConfig;
      const newPrimary = extractPrimary(mergedConfig);
      const newLogoUrl = extractLogoUrl(mergedConfig);
      if (
        newPrimary !== extractPrimary(existingConfig) ||
        newLogoUrl !== extractLogoUrl(existingConfig)
      ) {
        const prospect = await resolveProspect(prospects, {
          ownerId: input.ownerId,
          name: input.name || tradeMapper.untitledLabel,
          primaryColor: newPrimary,
          logoUrl: newLogoUrl,
        });
        update.prospectId = prospect.id;
      }
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
            },
            theme: hydratedTheme,
          } as TradeConfig)
        : (config ?? DEFAULT_TRADE_CONFIG),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  },
};
