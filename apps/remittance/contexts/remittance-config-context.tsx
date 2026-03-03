"use client";

/**
 * Remittance Config Context
 *
 * Provides branding and theme configuration to header and card components.
 * Reuses the same logo for both, following earn/wallet/checkouts patterns.
 */

import { createContext, useContext, type ReactNode } from "react";
import {
  type RemittanceConfig,
  type RemittanceBranding,
  type RemittanceTheme,
  DEFAULT_REMITTANCE_THEME,
} from "@/lib/remittance-config";

interface RemittanceConfigContextValue {
  config: RemittanceConfig;
  theme: Required<RemittanceTheme>;
  branding: RemittanceBranding;
}

const RemittanceConfigContext =
  createContext<RemittanceConfigContextValue | null>(null);

interface RemittanceConfigProviderProps {
  children: ReactNode;
  config?: RemittanceConfig;
}

export function RemittanceConfigProvider({
  children,
  config,
}: RemittanceConfigProviderProps) {
  const branding: RemittanceBranding = config?.branding ?? {};
  const theme: Required<RemittanceTheme> = {
    ...DEFAULT_REMITTANCE_THEME,
    ...config?.theme,
  };

  const value: RemittanceConfigContextValue = {
    config: { theme, branding },
    theme,
    branding,
  };

  return (
    <RemittanceConfigContext.Provider value={value}>
      {children}
    </RemittanceConfigContext.Provider>
  );
}

export function useRemittanceConfig(): RemittanceConfigContextValue {
  const context = useContext(RemittanceConfigContext);
  if (!context) {
    return {
      config: { theme: DEFAULT_REMITTANCE_THEME, branding: {} },
      theme: DEFAULT_REMITTANCE_THEME,
      branding: {},
    };
  }
  return context;
}
