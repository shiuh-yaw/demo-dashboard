"use client";

/**
 * Earn Config Context
 *
 * Provides Earn configuration (theme, branding, layout) to all child components.
 * Used by the /e/[id] route to apply custom branding.
 */

import { createContext, useContext, type ReactNode } from "react";
import type {
  EarnConfig,
  EarnBranding,
  EarnTheme,
  EarnLayout,
} from "@/lib/earn-config";
import {
  DEFAULT_EARN_THEME,
  DEFAULT_EARN_BRANDING,
  DEFAULT_EARN_LAYOUT,
} from "@/lib/earn-config";

/** Branding with required fields except logoUrl which is only needed for custom logos */
type BrandingWithDefaults = Required<Omit<EarnBranding, "logoUrl">> &
  Pick<EarnBranding, "logoUrl">;

interface EarnConfigContextValue {
  /** The full config */
  config: EarnConfig;
  /** Theme settings with defaults applied */
  theme: Required<EarnTheme>;
  /** Branding settings with defaults applied */
  branding: BrandingWithDefaults;
  /** Layout settings with defaults applied */
  layout: Required<EarnLayout>;
  /** The config ID (if loaded from API) */
  configId?: string;
  /** Title for the page (from stored config name) */
  title: string;
  /** Description for the page (from stored config description) */
  description: string;
}

const EarnConfigContext = createContext<EarnConfigContextValue | null>(null);

interface EarnConfigProviderProps {
  children: ReactNode;
  /** The config to provide (from API or defaults) */
  config?: EarnConfig;
  /** The config ID (if loaded from API) */
  configId?: string;
}

/**
 * Provides Earn configuration to child components
 */
export function EarnConfigProvider({
  children,
  config,
  configId,
}: EarnConfigProviderProps) {
  // Merge with defaults
  const theme: Required<EarnTheme> = {
    ...DEFAULT_EARN_THEME,
    ...config?.theme,
  };

  const branding: BrandingWithDefaults = {
    ...DEFAULT_EARN_BRANDING,
    ...config?.branding,
  };

  const layout: Required<EarnLayout> = {
    ...DEFAULT_EARN_LAYOUT,
    ...config?.layout,
  };

  const value: EarnConfigContextValue = {
    config: { theme, branding, layout },
    theme,
    branding,
    layout,
    configId,
    // Page title/description come from branding with defaults
    title: branding.pageTitle,
    description: branding.pageDescription,
  };

  return (
    <EarnConfigContext.Provider value={value}>
      {children}
    </EarnConfigContext.Provider>
  );
}

/**
 * Hook to access Earn configuration
 *
 * @returns The config context value, or defaults if not in a provider
 */
export function useEarnConfig(): EarnConfigContextValue {
  const context = useContext(EarnConfigContext);

  // Return defaults if not in a provider (for backwards compatibility)
  if (!context) {
    return {
      config: {
        theme: DEFAULT_EARN_THEME,
        branding: DEFAULT_EARN_BRANDING,
        layout: DEFAULT_EARN_LAYOUT,
      },
      theme: DEFAULT_EARN_THEME,
      branding: DEFAULT_EARN_BRANDING,
      layout: DEFAULT_EARN_LAYOUT,
      title: DEFAULT_EARN_BRANDING.pageTitle,
      description: DEFAULT_EARN_BRANDING.pageDescription,
    };
  }

  return context;
}
