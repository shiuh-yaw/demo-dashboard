"use client";

/**
 * Trade Config Context
 *
 * Provides branding and theme configuration to all trade app components.
 * Reuses the same config-driven pattern from the remittance app.
 */

import { createContext, useContext, type ReactNode } from "react";
import {
  type TradeConfig,
  type TradeBranding,
  type TradeTheme,
  DEFAULT_TRADE_THEME,
} from "@/lib/trade-config";

interface TradeConfigContextValue {
  config: TradeConfig;
  theme: Required<TradeTheme>;
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
  const theme: Required<TradeTheme> = {
    ...DEFAULT_TRADE_THEME,
    ...config?.theme,
  };

  const value: TradeConfigContextValue = {
    config: { theme, branding },
    theme,
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
      config: { theme: DEFAULT_TRADE_THEME, branding: {} },
      theme: DEFAULT_TRADE_THEME,
      branding: {},
    };
  }
  return context;
}
