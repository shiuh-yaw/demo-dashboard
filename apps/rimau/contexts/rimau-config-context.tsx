"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_APP_NAME, type RimauBranding, type RimauConfig } from "@/lib/rimau-config";

interface RimauConfigContextValue {
  config: RimauConfig;
  branding: RimauBranding;
  /** Resolved app name - the prospect's, or "Rimau". */
  appName: string;
  /** Resolved config id (from `x-rimau-config-id`); undefined when unbranded. */
  configId?: string;
  /** True when a prospect config resolved for this request. */
  isBranded: boolean;
}

const RimauConfigContext = createContext<RimauConfigContextValue | null>(null);

export function RimauConfigProvider({
  children,
  config,
  configId,
  isBranded,
}: {
  children: ReactNode;
  config?: RimauConfig;
  configId?: string;
  isBranded: boolean;
}) {
  const branding = config?.branding ?? {};
  const value: RimauConfigContextValue = {
    config: config ?? {},
    branding,
    appName: branding.appName?.trim() || DEFAULT_APP_NAME,
    configId,
    isBranded,
  };
  return <RimauConfigContext.Provider value={value}>{children}</RimauConfigContext.Provider>;
}

export function useRimauConfig(): RimauConfigContextValue {
  const ctx = useContext(RimauConfigContext);
  return ctx ?? { config: {}, branding: {}, appName: DEFAULT_APP_NAME, isBranded: false };
}
