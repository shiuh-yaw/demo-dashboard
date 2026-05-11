"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { WidgetConfig } from "@dynamic-demos/theme";

const DepositConfigContext = createContext<WidgetConfig | null>(null);

export function DepositConfigProvider({
  config,
  children,
}: {
  config: WidgetConfig | null;
  children: ReactNode;
}) {
  return (
    <DepositConfigContext.Provider value={config}>
      {children}
    </DepositConfigContext.Provider>
  );
}

export function useDepositConfig(): WidgetConfig | null {
  return useContext(DepositConfigContext);
}
