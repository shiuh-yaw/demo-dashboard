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
}

const VisaDirectConfigContext =
  createContext<VisaDirectConfigContextValue | null>(null);

interface VisaDirectConfigProviderProps {
  children: ReactNode;
  config?: Partial<VisaDirectConfig>;
}

export function VisaDirectConfigProvider({
  children,
  config,
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
    };
  }
  return context;
}
