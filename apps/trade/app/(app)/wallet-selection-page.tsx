"use client";

/**
 * Wallet Selection Page
 *
 * Uses shared AuthLayout (logo + footer) — same as login and KYC.
 * Shown after KYC when walletSelection is enabled and user has not yet selected.
 */

import { useCallback } from "react";
import { AuthLayout } from "@dynamic-demos/ui";
import { WalletSelectionScreen } from "@/components/screens/wallet-selection-screen";
import { useLogout } from "@/hooks/use-mutations";
import { AppLogo } from "@/components/ui/app-logo";
import { useTradeConfig } from "@/contexts/trade-config-context";

export function WalletSelectionPage() {
  const logoutMutation = useLogout();
  const { branding } = useTradeConfig();

  const handleComplete = useCallback(() => {
    window.location.href = "/portfolio";
  }, []);

  return (
    <AuthLayout logo={<AppLogo size={40} logoUrl={branding.logoUrl} />}>
      <div className="w-full space-y-3">
        <WalletSelectionScreen onComplete={handleComplete} />
        <button
          onClick={() =>
            logoutMutation.mutate(undefined, {
              onSuccess: () => {
                window.location.href = "/login";
              },
            })
          }
          disabled={logoutMutation.isPending}
          className="w-full text-xs text-(--widget-muted) hover:text-(--widget-fg) transition-colors disabled:opacity-50 cursor-pointer"
        >
          {logoutMutation.isPending ? "Logging out…" : "Log out"}
        </button>
      </div>
    </AuthLayout>
  );
}
