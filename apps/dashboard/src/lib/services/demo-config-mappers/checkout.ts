/**
 * Checkout ↔ DemoConfig mapper. See `earn.ts` for the pattern.
 *
 * `StoredCheckoutConfig` carries `mode` and `config: WidgetConfig`. The
 * `mode` field is preserved on the embedded config payload so the
 * legacy round-trip is lossless. Brand hashing uses
 * `(theme.primaryColor, branding.logo?)` — `WidgetBranding.logo` is a
 * URL string (no custom/dynamic discriminator).
 */

import {
  DEFAULT_WIDGET_CONFIG,
  DEFAULT_THEME,
  type WidgetConfig,
} from "@/lib/widget-config";
import type {
  CheckoutMode,
  StoredCheckoutConfig,
} from "@/lib/types/dashboard";

import { resolveBrand } from "./brand-resolver";
import type { DemoConfigMapper } from "./types";

const DEFAULT_PRIMARY = DEFAULT_THEME.primaryColor;

/**
 * Carry the legacy `mode` field through `config: Json`. We embed it
 * inside the widget config payload so the unified `DemoConfig` row
 * doesn't need a separate column.
 */
interface CheckoutConfigPayload extends WidgetConfig {
  mode: WidgetConfig["mode"];
  _checkoutMode?: CheckoutMode;
}

function pickPrimary(c: Partial<WidgetConfig> | undefined): string {
  return c?.theme?.primaryColor ?? DEFAULT_PRIMARY;
}

function pickLogoUrl(c: Partial<WidgetConfig> | undefined): string | null {
  const logo = c?.branding?.logo;
  return logo && logo.length > 0 ? logo : null;
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
  name: string | null;
  description?: string | null;
  mode?: CheckoutMode;
  config: WidgetConfig;
}

export interface CheckoutMapperUpdateInput {
  ownerId: string;
  name?: string | null;
  description?: string | null;
  mode?: CheckoutMode;
  config?: Partial<WidgetConfig>;
}

export const checkoutMapper: Omit<
  DemoConfigMapper<WidgetConfig, StoredCheckoutConfig>,
  "toCreateInput" | "toUpdateInput"
> & {
  toCreateInput(
    brands: import("../types").BrandService,
    input: CheckoutMapperCreateInput,
  ): Promise<import("../types").CreateDemoConfigInput>;
  toUpdateInput(
    brands: import("../types").BrandService,
    existing: import("../types").DemoConfigRecord,
    input: CheckoutMapperUpdateInput,
  ): Promise<import("../types").UpdateDemoConfigInput>;
} = {
  kind: "checkout",
  untitledLabel: "Untitled Checkout",

  async toCreateInput(brands, input) {
    const merged = mergeConfig(DEFAULT_WIDGET_CONFIG, input.config);
    const payload: CheckoutConfigPayload = {
      ...merged,
      _checkoutMode: input.mode ?? "payment",
    };
    const brand = await resolveBrand(brands, {
      ownerId: input.ownerId,
      name: input.name || checkoutMapper.untitledLabel,
      primaryColor: pickPrimary(merged),
      logoUrl: pickLogoUrl(merged),
    });
    return {
      kind: checkoutMapper.kind,
      ownerId: input.ownerId,
      name: input.name && input.name.length > 0 ? input.name : null,
      description: input.description ?? null,
      brandId: brand.id,
      themeOverrides: null,
      config: payload as unknown as Record<string, unknown>,
    };
  },

  async toUpdateInput(brands, existing, input) {
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
    if (input.config !== undefined || input.mode !== undefined) {
      const nextMode =
        input.mode ?? existingConfig._checkoutMode ?? "payment";
      const payload: CheckoutConfigPayload = {
        ...mergedConfig,
        _checkoutMode: nextMode,
      };
      update.config = payload;
      const newPrimary = pickPrimary(mergedConfig);
      const newLogoUrl = pickLogoUrl(mergedConfig);
      if (
        newPrimary !== pickPrimary(existingConfig) ||
        newLogoUrl !== pickLogoUrl(existingConfig)
      ) {
        const brand = await resolveBrand(brands, {
          ownerId: input.ownerId,
          name: input.name || checkoutMapper.untitledLabel,
          primaryColor: newPrimary,
          logoUrl: newLogoUrl,
        });
        update.brandId = brand.id;
      }
    }
    return update;
  },

  toStored(record, brand) {
    const payload = record.config as CheckoutConfigPayload | null | undefined;
    const mode: CheckoutMode = payload?._checkoutMode ?? "payment";
    const hydratedTheme = brand
      ? {
          ...payload?.theme,
          primaryColor: brand.primaryColor,
          primaryHoverColor: brand.primaryHoverColor ?? undefined,
          accentColor: brand.accentColor ?? undefined,
          ...(record.themeOverrides as object | null | undefined),
        }
      : payload?.theme;
    const config: WidgetConfig = payload
      ? {
          ...(payload as WidgetConfig),
          theme: hydratedTheme,
        }
      : DEFAULT_WIDGET_CONFIG;
    return {
      id: record.id,
      name: record.name ?? checkoutMapper.untitledLabel,
      description: record.description ?? undefined,
      mode,
      config,
      ownerId: record.ownerId || undefined,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  },
};
