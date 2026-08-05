"use client";

/**
 * Thin config-reader over the shared ResetThemeButton, matching the wrapper the
 * other demos keep. Keyed off `configId`, not `isBranded`: a theme that was
 * requested but failed to resolve still leaves a sticky cookie, and this is the
 * only way to clear it.
 *
 * `variant="link"` because this sits in the shell's footer row - the same place
 * every scenario demo puts Clear theme via `buildScenarioChrome`. This app is
 * console-shaped (no hero, no ScenarioLayout) so it can't use that helper, but
 * the control belongs in the same spot.
 */

import { ResetThemeButton as SharedResetThemeButton } from "@dynamic-demos/ui";

import { useVisaDirectConfig } from "@/contexts/visa-direct-config-context";

export function ResetThemeButton() {
  const { configId } = useVisaDirectConfig();
  return <SharedResetThemeButton active={!!configId} variant="link" />;
}
