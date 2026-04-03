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
}

const TradeConfigContext = createContext<TradeConfigContextValue | null>(null);

interface TradeConfigProviderProps {
  children: ReactNode;
  config?: TradeConfig;
}

export function TradeConfigProvider({
  children,
  config,
}: TradeConfigProviderProps) {
  const branding: TradeBranding = config?.branding ?? {};

  const value: TradeConfigContextValue = {
    config: { branding },
    branding,
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
