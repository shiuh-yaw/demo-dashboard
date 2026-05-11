"use client";

/**
 * Remittance Config Context
 *
 * Provides the resolved branding for header / card components on the
 * client. Theme tokens are NOT exposed here — they're injected as
 * `--brand-*` CSS variables at SSR via `<ThemeStyleTag overridesOnly>`
 * in `app/layout.tsx`. Components consume `var(--brand-*)` directly.
 */

import { createContext, useContext, type ReactNode } from "react";
import type {
  RemittanceConfig,
  RemittanceBranding,
} from "@/lib/remittance-config";

interface RemittanceConfigContextValue {
  config: RemittanceConfig;
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

  const value: RemittanceConfigContextValue = {
    config: config ?? { branding },
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
      config: { branding: {} },
      branding: {},
    };
  }
  return context;
}
