"use client";

import {
  WidgetCard,
  widgetHeaderTrailingIconButtonClassName,
} from "@dynamic-demos/ui";
import { LogOut } from "lucide-react";
import { useDepositWidgetFlow } from "@/contexts/deposit-widget-flow-context";
import { DepositFullCardLoadingBody } from "./deposit-widget-loading";

/** Vault provisioning spinner; must render under {@link DepositWidgetFlowProvider}. */
export function ProvisioningScreen() {
  const { handleLogout: onLogout } = useDepositWidgetFlow();
  const logoutTrailing = (
    <button
      type="button"
      onClick={() => void Promise.resolve(onLogout())}
      className={widgetHeaderTrailingIconButtonClassName}
      aria-label="Log out"
      title="Log out"
    >
      <LogOut className="size-4" strokeWidth={2} aria-hidden />
    </button>
  );

  return (
    <WidgetCard title="Deposit" trailing={logoutTrailing}>
      <DepositFullCardLoadingBody />
    </WidgetCard>
  );
}
