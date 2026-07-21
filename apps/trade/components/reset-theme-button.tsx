"use client";

/**
 * Thin config-reader over the shared ResetThemeButton: renders only
 * when a branded config is active. Clearing navigates with an empty
 * `?theme=` so the middleware deletes `trade_config_id`.
 */

import { ResetThemeButton as SharedResetThemeButton } from "@dynamic-demos/ui";
import { useTradeConfig } from "@/contexts/trade-config-context";

export function ResetThemeButton() {
  const { configId } = useTradeConfig();
  return <SharedResetThemeButton active={!!configId} />;
}
