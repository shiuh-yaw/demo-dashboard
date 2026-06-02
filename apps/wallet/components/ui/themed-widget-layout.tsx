"use client";

import { type ReactNode } from "react";
import { DynamicLogo, PoweredByFooter } from "@dynamic-demos/ui";
import { useWalletConfig } from "@/contexts/wallet-config-context";

/**
 * Wallet page shell — branding only.
 *
 * Theme tokens are injected at the document level by `<ThemeStyleTag>`
 * in `app/layout.tsx` (the unified pattern shared with remittance and
 * visa-direct). Brand config (logo, showPoweredBy) is provided via
 * `WalletConfigProvider` from the same layout. This component reads
 * those, falls back to the Dynamic logo when no brand is set, and
 * uses `--brand-page-bg` for the background — automatically picking
 * up per-config overrides via the inline <style> from layout.
 */
export function ThemedWidgetLayout({ children }: { children: ReactNode }) {
  const config = useWalletConfig();
  const branding = config?.branding;
  const showPoweredBy = branding?.showPoweredBy !== false;

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center p-6 overscroll-none"
      style={{ backgroundColor: "var(--brand-page-bg)" }}
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full">
        <div className="shrink-0 mb-2">
          {branding?.logo === "custom" && branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.name ? `${branding.name} logo` : "Brand logo"}
              className="h-12 object-contain"
            />
          ) : (
            <DynamicLogo wordmark className="h-10 w-auto" />
          )}
        </div>
        <div className="w-full max-w-[400px]">{children}</div>
      </div>

      {showPoweredBy && (
        <div className="shrink-0 mt-auto">
          <PoweredByFooter />
        </div>
      )}
    </div>
  );
}
