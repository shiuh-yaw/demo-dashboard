"use client";

/**
 * Thin config-reader over the shared ResetThemeButton: renders only
 * when a branded config is active. Clearing navigates with an empty
 * `?theme=` so the middleware deletes `earn_config_id`.
 */

import { ResetThemeButton as SharedResetThemeButton } from "@dynamic-demos/ui";
import { useEarnConfig } from "@/contexts/earn-config-context";

export function ResetThemeButton() {
  const { configId } = useEarnConfig();
  return <SharedResetThemeButton active={!!configId} />;
}
