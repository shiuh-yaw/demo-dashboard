"use client";

/**
 * Earn Config Context
 *
 * Provides Earn configuration (theme, branding, layout) to all child
 * components. Hydrated once by the root `app/layout.tsx` from the result
 * of `fetchDemoConfig({ demoType: "earn", id: headers().get("x-earn-config-id"), fallback: DEFAULT_EARN_CONFIG })`.
 *
 * The provider takes the resolved `EarnConfig` (always defined — the
 * fetcher merges over `DEFAULT_EARN_CONFIG` on miss) plus an optional
 * `configId` from the middleware header. Title/description come from
 * `branding.pageTitle`/`pageDescription` (with branding defaults filling
 * the gap when not explicitly set by the operator).
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type {
  EarnBranding,
  EarnConfig,
  EarnLayout,
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
  /** The config ID (if forwarded by middleware). */
  configId?: string;
  /** Title for the page (sourced from branding.pageTitle, with default). */
  title: string;
  /** Description for the page (sourced from branding.pageDescription, with default). */
  description: string;
}

const EarnConfigContext = createContext<EarnConfigContextValue | null>(null);

interface EarnConfigProviderProps {
  children: ReactNode;
  /**
   * The resolved Earn config — always defined since the layout's
   * `fetchDemoConfig` call merges over `DEFAULT_EARN_CONFIG` on miss.
   */
  config: EarnConfig;
  /** Forwarded middleware header value, when present. */
  configId?: string;
}

/**
 * Provides Earn configuration to child components.
 */
export function EarnConfigProvider({
  children,
  config,
  configId,
}: EarnConfigProviderProps) {
  const value = useMemo<EarnConfigContextValue>(() => {
    const branding: BrandingWithDefaults = {
      ...DEFAULT_EARN_BRANDING,
      ...config.branding,
    };

    const layout: Required<EarnLayout> = {
      ...DEFAULT_EARN_LAYOUT,
      ...config.layout,
    };

    const title = config.branding?.pageTitle ?? branding.pageTitle;
    const description =
      config.branding?.pageDescription ?? branding.pageDescription;

    // Theme tokens are emitted as `--brand-*` CSS variables at SSR via
    // `<ThemeStyleTag>` in the root layout; components consume them as
    // `var(--brand-*)` directly. The context exposes only branding/layout/
    // metadata.
    return {
      config: { theme: config.theme, branding, layout },
      branding,
      layout,
      configId,
      title,
      description,
    };
  }, [config, configId]);

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
