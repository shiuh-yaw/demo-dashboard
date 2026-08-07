"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { WidgetConfig } from "@dynamic-demos/theme";

const AccountsConfigContext = createContext<WidgetConfig | null>(null);

export function AccountsConfigProvider({
  config,
  children,
}: {
  config: WidgetConfig | null;
  children: ReactNode;
}) {
  return (
    <AccountsConfigContext.Provider value={config}>
      {children}
    </AccountsConfigContext.Provider>
  );
}

export function useAccountsConfig(): WidgetConfig | null {
  return useContext(AccountsConfigContext);
}
