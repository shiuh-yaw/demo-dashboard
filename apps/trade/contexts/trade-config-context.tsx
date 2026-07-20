"use client";

/**
 * Trade Config Context
 *
 * Provides branding configuration to all trade app components.
 * Reuses the same config-driven pattern from the remittance app.
 */

import { createContext, useContext, type ReactNode } from "react";
import {
  type TradeConfig,
  type TradeBranding,
} from "@/lib/trade-config";

interface TradeConfigContextValue {
  config: TradeConfig;
  branding: TradeBranding;
  /** Resolved config id (from `x-trade-config-id`); undefined unbranded. */
  configId?: string;
}

const TradeConfigContext = createContext<TradeConfigContextValue | null>(null);

interface TradeConfigProviderProps {
  children: ReactNode;
  config?: TradeConfig;
  configId?: string;
}

export function TradeConfigProvider({
  children,
  config,
  configId,
}: TradeConfigProviderProps) {
  const branding: TradeBranding = config?.branding ?? {};

  const value: TradeConfigContextValue = {
    config: { branding },
    branding,
    configId,
  };

  return (
    <TradeConfigContext.Provider value={value}>
      {children}
    </TradeConfigContext.Provider>
  );
}

export function useTradeConfig(): TradeConfigContextValue {
  const context = useContext(TradeConfigContext);
  if (!context) {
    return {
      config: { branding: {} },
      branding: {},
    };
  }
  return context;
}
