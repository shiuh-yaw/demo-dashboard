"use client";

/**
 * Earn Config Context
 *
 * Provides Earn configuration (theme, branding, layout) to all child
 * components. Hydrated once by the root `app/layout.tsx` from the result
 * of `getEarnConfig(headers().get("x-earn-config-id"))`.
 *
 * The provider takes the raw `StoredEarnConfig` (or null for the default
 * route) and merges its `config.theme`/`config.branding`/`config.layout`
 * with package defaults. Title/description are sourced from
 * `branding.pageTitle`/`branding.pageDescription` (with stored
 * `name`/`description` as a soft fallback so dashboard-side names show up
 * in the page header without explicit branding overrides).
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type {
  EarnBranding,
  EarnConfig,
  EarnLayout,
  StoredEarnConfig,
} from "@/lib/earn-config";
import {
  DEFAULT_EARN_BRANDING,
  DEFAULT_EARN_LAYOUT,
} from "@/lib/earn-config";

/** Branding with required fields except logoUrl which is only needed for custom logos */
type BrandingWithDefaults = Required<Omit<EarnBranding, "logoUrl">> &
  Pick<EarnBranding, "logoUrl">;

interface EarnConfigContextValue {
  /** The full config */
  config: EarnConfig;
  /** Branding settings with defaults applied */
  branding: BrandingWithDefaults;
  /** Layout settings with defaults applied */
  layout: Required<EarnLayout>;
  /** The config ID (if loaded from API) */
  configId?: string;
  /** Title for the page (from stored config name + branding override) */
  title: string;
  /** Description for the page (from stored config description + branding override) */
  description: string;
}

const EarnConfigContext = createContext<EarnConfigContextValue | null>(null);

interface EarnConfigProviderProps {
  children: ReactNode;
  /**
   * The hydrated server-side config (or null for the default route).
   * Replaces the previous `{ config, configId }` pair so the provider
   * has a single source of truth for the per-config context.
   */
  storedConfig: StoredEarnConfig | null;
}

/**
 * Provides Earn configuration to child components.
 */
export function EarnConfigProvider({
  children,
  storedConfig,
}: EarnConfigProviderProps) {
  const value = useMemo<EarnConfigContextValue>(() => {
    const config = storedConfig?.config ?? {};

    const branding: BrandingWithDefaults = {
      ...DEFAULT_EARN_BRANDING,
      ...config.branding,
    };

    const layout: Required<EarnLayout> = {
      ...DEFAULT_EARN_LAYOUT,
      ...config.layout,
    };

    // Stored name/description as a soft fallback for the page header.
    // Branding's pageTitle/pageDescription still wins when set explicitly
    // by the operator (DEFAULT_EARN_BRANDING fills these with "Earn" / the
    // standard description, so the explicit-vs-default distinction is
    // maintained by checking the stored config first).
    const title =
      storedConfig?.config?.branding?.pageTitle ??
      storedConfig?.name ??
      branding.pageTitle;
    const description =
      storedConfig?.config?.branding?.pageDescription ??
      storedConfig?.description ??
      branding.pageDescription;

    // Theme tokens are emitted as `--brand-*` CSS variables at SSR via
    // `<ThemeStyleTag>` in the root layout; components consume them as
    // `var(--brand-*)` directly. The context exposes only branding/layout/
    // metadata.
    return {
      config: { theme: config.theme, branding, layout },
      branding,
      layout,
      configId: storedConfig?.id,
      title,
      description,
    };
  }, [storedConfig]);

  return (
    <EarnConfigContext.Provider value={value}>
      {children}
    </EarnConfigContext.Provider>
  );
}

/**
 * Hook to access Earn configuration.
 *
 * Returns defaults if not in a provider (for backwards compatibility with
 * tests / preview tools that render components in isolation).
 */
export function useEarnConfig(): EarnConfigContextValue {
  const context = useContext(EarnConfigContext);

  if (!context) {
    return {
      config: {
        branding: DEFAULT_EARN_BRANDING,
        layout: DEFAULT_EARN_LAYOUT,
      },
      branding: DEFAULT_EARN_BRANDING,
      layout: DEFAULT_EARN_LAYOUT,
      title: DEFAULT_EARN_BRANDING.pageTitle,
      description: DEFAULT_EARN_BRANDING.pageDescription,
    };
  }

  return context;
}
