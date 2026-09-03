"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_APP_NAME, type ExchangeBranding, type ExchangeConfig } from "@/lib/exchange-config";

interface ExchangeConfigContextValue {
  config: ExchangeConfig;
  branding: ExchangeBranding;
  /** Resolved app name - the prospect's, or "Exchange". */
  appName: string;
  /** Resolved config id (from `x-exchange-config-id`); undefined when unbranded. */
  configId?: string;
  /** True when a prospect config resolved for this request. */
  isBranded: boolean;
}

const ExchangeConfigContext = createContext<ExchangeConfigContextValue | null>(null);

export function ExchangeConfigProvider({
  children,
  config,
  configId,
  isBranded,
}: {
  children: ReactNode;
  config?: ExchangeConfig;
  configId?: string;
  isBranded: boolean;
}) {
  const branding = config?.branding ?? {};
  const value: ExchangeConfigContextValue = {
    config: config ?? {},
    branding,
    appName: branding.appName?.trim() || DEFAULT_APP_NAME,
    configId,
    isBranded,
  };
  return <ExchangeConfigContext.Provider value={value}>{children}</ExchangeConfigContext.Provider>;
}

export function useExchangeConfig(): ExchangeConfigContextValue {
  const ctx = useContext(ExchangeConfigContext);
  return ctx ?? { config: {}, branding: {}, appName: DEFAULT_APP_NAME, isBranded: false };
}
