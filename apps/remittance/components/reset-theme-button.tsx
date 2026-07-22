"use client";

/**
 * Thin config-reader over the shared ResetThemeButton: renders only
 * when a branded config is active. Clearing navigates with an empty
 * `?theme=` so the middleware deletes `remittance_config_id`. Rendered
 * as a footer link (the only surface that hosts it).
 */

import { ResetThemeButton as SharedResetThemeButton } from "@dynamic-demos/ui";
import { useRemittanceConfig } from "@/contexts/remittance-config-context";

export function ResetThemeButton() {
  const { configId } = useRemittanceConfig();
  return <SharedResetThemeButton active={!!configId} variant="link" />;
}
