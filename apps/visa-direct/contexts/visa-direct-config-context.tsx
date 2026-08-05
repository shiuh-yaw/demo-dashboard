"use client";

/**
 * Visa Direct Config Context
 *
 * Provides branding + theme configuration to Visa Direct components.
 * The server layout merges a stored config (fetched from the dashboard API)
 * over DEFAULT_VISA_DIRECT_CONFIG and passes the result in as `config`.
 */

import { createContext, useContext, type ReactNode } from "react";
import {
  DEFAULT_VISA_DIRECT_CONFIG,
  type VisaDirectBranding,
  type VisaDirectConfig,
  type VisaDirectTheme,
} from "@/lib/visa-direct-config";

interface VisaDirectConfigContextValue {
  config: VisaDirectConfig;
  branding: VisaDirectBranding;
  theme: VisaDirectTheme;
  /**
   * The prospect config resolved for this request. Can't be inferred from
   * `branding` - the provider merges over DEFAULT_VISA_DIRECT_CONFIG, so those
   * fields are always populated whether or not a config was resolved. Drives
   * chrome: branded drops the Dynamic site header.
   */
  isBranded: boolean;
  /**
   * A theme was *requested* (sticky cookie or `?theme=`), regardless of whether
   * it resolved. Distinct from `isBranded` on purpose: Clear theme has to stay
   * reachable when the fetch fails, or a stuck cookie has no escape hatch.
   */
  configId: string | null;
}

const VisaDirectConfigContext =
  createContext<VisaDirectConfigContextValue | null>(null);

interface VisaDirectConfigProviderProps {
  children: ReactNode;
  config?: Partial<VisaDirectConfig>;
  /** Resolved demo-config id from `x-visa-direct-config-id`, or null. */
  configId?: string | null;
  /**
   * Whether the demo config actually resolved. Must come from the fetch, not
   * from `configId`: an id with a failed fetch would otherwise render branded
   * chrome over an unbranded page.
   */
  isBranded?: boolean;
}

export function VisaDirectConfigProvider({
  children,
  config,
  configId = null,
  isBranded = false,
}: VisaDirectConfigProviderProps) {
  const resolved: VisaDirectConfig = {
    branding: {
      ...DEFAULT_VISA_DIRECT_CONFIG.branding,
      ...config?.branding,
    },
    theme: {
      ...DEFAULT_VISA_DIRECT_CONFIG.theme,
      ...config?.theme,
    },
  };

  const value: VisaDirectConfigContextValue = {
    config: resolved,
    branding: resolved.branding,
    theme: resolved.theme,
    isBranded,
    configId,
  };

  return (
    <VisaDirectConfigContext.Provider value={value}>
      {children}
    </VisaDirectConfigContext.Provider>
  );
}

/**
 * Returns the current Visa Direct config. When used outside a provider
 * (e.g. in a unit test or storybook), falls back to DEFAULT_VISA_DIRECT_CONFIG.
 */
export function useVisaDirectConfig(): VisaDirectConfigContextValue {
  const context = useContext(VisaDirectConfigContext);
  if (!context) {
    return {
      config: DEFAULT_VISA_DIRECT_CONFIG,
      branding: DEFAULT_VISA_DIRECT_CONFIG.branding,
      theme: DEFAULT_VISA_DIRECT_CONFIG.theme,
      isBranded: false,
      configId: null,
    };
  }
  return context;
}
