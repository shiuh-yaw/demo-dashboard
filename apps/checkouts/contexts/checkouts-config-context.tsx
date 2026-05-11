"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { WidgetConfig } from "@/lib/widget-config";

/**
 * Provides the checkouts config (theme + branding + widget settings)
 * fetched once in `app/layout.tsx` to client components in the tree.
 * Mirrors wallet's `WalletConfigProvider`.
 *
 * Components that need only theme tokens should consume CSS variables
 * (`var(--brand-*)`) — those are injected once at the document level via
 * `<ThemeStyleTag>`. Use this context for branding (logo, name,
 * showPoweredBy) and any widget-config-driven behavior.
 */

const CheckoutsConfigContext = createContext<WidgetConfig | null>(null);

export function CheckoutsConfigProvider({
  config,
  children,
}: {
  config: WidgetConfig | null;
  children: ReactNode;
}) {
  return (
    <CheckoutsConfigContext.Provider value={config}>
      {children}
    </CheckoutsConfigContext.Provider>
  );
}

export function useCheckoutsConfig(): WidgetConfig | null {
  return useContext(CheckoutsConfigContext);
}
