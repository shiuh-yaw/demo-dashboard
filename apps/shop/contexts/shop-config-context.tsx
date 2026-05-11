"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { WidgetConfig } from "@dynamic-demos/theme";

const ShopConfigContext = createContext<WidgetConfig | null>(null);

export function ShopConfigProvider({
  config,
  children,
}: {
  config: WidgetConfig | null;
  children: ReactNode;
}) {
  return (
    <ShopConfigContext.Provider value={config}>
      {children}
    </ShopConfigContext.Provider>
  );
}

export function useShopConfig(): WidgetConfig | null {
  return useContext(ShopConfigContext);
}
