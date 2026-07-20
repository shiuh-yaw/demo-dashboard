"use client";

/**
 * Small text button below the scenario widget that clears the sticky
 * theme cookie (wallet/earn parity). Navigating with an empty `?theme=`
 * makes the demo middleware delete `trade_config_id`, so the page
 * re-renders in the default Dynamic chrome. Renders nothing when no
 * branded config is active (there is nothing to clear).
 */

import { useTradeConfig } from "@/contexts/trade-config-context";

export function ResetThemeButton() {
  const { configId } = useTradeConfig();
  if (!configId) return null;

  return (
    <div className="mt-3 text-center">
      <button
        type="button"
        // Full document navigation on purpose: the middleware must run to
        // delete the cookie, and the root layout (theme <style>) must
        // re-render — client-side routing guarantees neither.
        onClick={() => window.location.assign("/?theme=")}
        className="text-xs text-(--brand-muted) transition-colors hover:text-(--brand-fg)"
      >
        Clear theme
      </button>
    </div>
  );
}
