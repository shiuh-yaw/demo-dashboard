"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { WidgetConfig } from "@dynamic-demos/theme";

const WalletConfigContext = createContext<WidgetConfig | null>(null);

export function WalletConfigProvider({
  config,
  children,
}: {
  config: WidgetConfig | null;
  children: ReactNode;
}) {
  return (
    <WalletConfigContext.Provider value={config}>
      {children}
    </WalletConfigContext.Provider>
  );
}

export function useWalletConfig(): WidgetConfig | null {
  return useContext(WalletConfigContext);
}
