"use client";

/**
 * DepositWidget (shell)
 * ----------------------
 * Wraps {@link DepositWidgetFlowProvider} so the flow hook runs once; routed
 * content reads state via {@link useDepositWidgetFlow}.
 */

import { WidgetCard } from "@dynamic-demos/ui";
import {
  DepositWidgetFlowProvider,
  useDepositWidgetFlow,
} from "@/contexts/deposit-widget-flow-context";
import { ConnectScreen } from "./connect-screen";
import { ProvisioningScreen } from "./provisioning-screen";
import { DepositScreen } from "./deposit-screen";
import { DepositFullCardLoadingBody } from "./deposit-widget-loading";
import type { DepositSessionBootstrap } from "@/lib/deposit-session-bootstrap";

export function DepositWidget({
  sessionBootstrap,
}: {
  sessionBootstrap: DepositSessionBootstrap;
}) {
  return (
    <DepositWidgetFlowProvider sessionBootstrap={sessionBootstrap}>
      <DepositWidgetBody />
    </DepositWidgetFlowProvider>
  );
}

function DepositWidgetBody() {
  const { screen, isBlockingLoad } = useDepositWidgetFlow();

  if (isBlockingLoad) {
    return (
      <WidgetCard title="Deposit">
        <DepositFullCardLoadingBody />
      </WidgetCard>
    );
  }

  switch (screen.type) {
    case "connect":
      return <ConnectScreen />;
    case "provisioning":
      return <ProvisioningScreen />;
    case "deposit":
      return <DepositScreen />;
  }
}
