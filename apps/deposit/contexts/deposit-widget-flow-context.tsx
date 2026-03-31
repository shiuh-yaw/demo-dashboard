"use client";

/**
 * Single source of truth for the deposit widget flow.
 *
 * - Call `useDepositWidgetController()` only here (inside the provider).
 * - Phase UI (`ConnectScreen`, `ProvisioningScreen`, `DepositScreen`)
 *   should use `useDepositWidgetFlow()` so props aren’t duplicated and the FSM
 *   stays one place.
 *
 * Network selection is orthogonal — see {@link useDepositNetwork} from
 * `deposit-network-context`.
 */

import { createContext, useContext, type ReactNode } from "react";
import { useDepositWidgetController } from "@/hooks/use-deposit-widget-controller";
import type { DepositSessionBootstrap } from "@/lib/deposit-session-bootstrap";

// Re-export screen union for callers that branch without pulling from hook file.
export type { DepositWidgetScreen } from "@/hooks/use-deposit-widget-controller";

export type DepositWidgetFlowValue = ReturnType<
  typeof useDepositWidgetController
>;

const DepositWidgetFlowContext = createContext<DepositWidgetFlowValue | null>(
  null,
);

export function DepositWidgetFlowProvider({
  children,
  sessionBootstrap,
}: {
  children: ReactNode;
  sessionBootstrap: DepositSessionBootstrap;
}) {
  const value = useDepositWidgetController(sessionBootstrap);
  return (
    <DepositWidgetFlowContext.Provider value={value}>
      {children}
    </DepositWidgetFlowContext.Provider>
  );
}

export function useDepositWidgetFlow(): DepositWidgetFlowValue {
  const ctx = useContext(DepositWidgetFlowContext);
  if (!ctx) {
    throw new Error(
      "useDepositWidgetFlow must be used within <DepositWidgetFlowProvider> (render under <DepositWidget />).",
    );
  }
  return ctx;
}
