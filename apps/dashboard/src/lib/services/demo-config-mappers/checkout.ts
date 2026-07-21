/**
 * Checkout ↔ DemoConfig mapper. See `earn.ts` for the pattern.
 *
 * `StoredCheckoutConfig` carries `mode` and `config: WidgetConfig`. The
 * `mode` field is preserved on the embedded config payload so the
 * legacy round-trip is lossless. `WidgetBranding.logo` is a URL string
 * (no custom/dynamic discriminator).
 */

import {
  DEFAULT_WIDGET_CONFIG,
  type WidgetConfig,
} from "@/lib/widget-config";
import type {
  CheckoutMode,
  StoredCheckoutConfig,
} from "@/lib/types/dashboard";

import {
  hydrateProspectTheme,
  prospectDisplayFields,
  prospectLogoUrl,
} from "./prospect-hydration";
import type { DemoConfigMapper } from "./types";

/**
 * Carry the legacy `mode` field through `config: Json`. We embed it
 * inside the widget config payload so the unified `DemoConfig` row
 * doesn't need a separate column.
 */
interface CheckoutConfigPayload extends WidgetConfig {
  mode: WidgetConfig["mode"];
  _checkoutMode?: CheckoutMode;
}

function mergeConfig(
  base: WidgetConfig,
  partial: Partial<WidgetConfig> | undefined,
): WidgetConfig {
  if (!partial) return base;
  return {
    ...base,
    ...partial,
    ui: { ...base.ui, ...partial.ui },
    theme: { ...base.theme, ...partial.theme },
    branding: { ...base.branding, ...partial.branding },
  };
}

export interface CheckoutMapperCreateInput {
  ownerId: string;
  createdById?: string | null;
  name: string | null;
  description?: string | null;
  mode?: CheckoutMode;
  prospectId: string | null;
  config: WidgetConfig;
}

export interface CheckoutMapperUpdateInput {
  ownerId: string;
  name?: string | null;
  description?: string | null;
  mode?: CheckoutMode;
  prospectId?: string | null;
  config?: Partial<WidgetConfig>;
}

export const checkoutMapper: Omit<
  DemoConfigMapper<WidgetConfig, StoredCheckoutConfig>,
  "toCreateInput" | "toUpdateInput"
> & {
  toCreateInput(
    prospects: import("../types").ProspectService,
    input: CheckoutMapperCreateInput,
  ): Promise<import("../types").CreateDemoConfigInput>;
  toUpdateInput(
    prospects: import("../types").ProspectService,
    existing: import("../types").DemoConfigRecord,
    input: CheckoutMapperUpdateInput,
  ): Promise<import("../types").UpdateDemoConfigInput>;
} = {
  kind: "checkout",
  untitledLabel: "Untitled Checkout",

  async toCreateInput(_prospects, input) {
    const merged = mergeConfig(DEFAULT_WIDGET_CONFIG, input.config);
    const payload: CheckoutConfigPayload = {
      ...merged,
      _checkoutMode: input.mode ?? "payment",
    };
    return {
      kind: checkoutMapper.kind,
      ownerId: input.ownerId,
      createdById: input.createdById ?? null,
      name: input.name && input.name.length > 0 ? input.name : null,
      description: input.description ?? null,
      prospectId: input.prospectId,
      themeOverrides: null,
      config: payload as unknown as Record<string, unknown>,
    };
  },

  async toUpdateInput(_prospects, existing, input) {
    const existingConfig = existing.config as CheckoutConfigPayload;
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
    if (input.config !== undefined || input.mode !== undefined) {
      const nextMode =
        input.mode ?? existingConfig._checkoutMode ?? "payment";
      const payload: CheckoutConfigPayload = {
        ...mergedConfig,
        _checkoutMode: nextMode,
      };
      update.config = payload;
    }
    return update;
  },

  toStored(record, prospect) {
    const payload = record.config as CheckoutConfigPayload | null | undefined;
    const mode: CheckoutMode = payload?._checkoutMode ?? "payment";
    const hydratedTheme = hydrateProspectTheme(
      prospect,
      payload?.theme as Record<string, unknown> | undefined,
      record.themeOverrides,
      { foregroundKey: "foreground" },
    );
    const logoUrl = prospectLogoUrl(prospect);
    const config: WidgetConfig = payload
      ? {
          ...(payload as WidgetConfig),
          theme: hydratedTheme,
          branding: {
            ...payload.branding,
            ...(logoUrl != null && { logo: logoUrl }),
          },
        }
      : DEFAULT_WIDGET_CONFIG;
    return {
      id: record.id,
      name: record.name ?? checkoutMapper.untitledLabel,
      description: record.description ?? undefined,
      mode,
      config,
      ownerId: record.ownerId || undefined,
      prospectId: record.prospectId,
      ...prospectDisplayFields(prospect),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  },
};
