"use client";

/**
 * Thin config-reader over the shared ResetThemeButton: renders only
 * when a branded config is active. Clearing navigates with an empty
 * `?theme=` so the middleware deletes `wallet_config_id`.
 */

import { ResetThemeButton as SharedResetThemeButton } from "@dynamic-demos/ui";
import { useWalletConfig } from "@/contexts/wallet-config-context";

export function ResetThemeButton() {
  const config = useWalletConfig();
  const isBranded = !!config && Object.keys(config).length > 0;
  return <SharedResetThemeButton active={isBranded} />;
}
