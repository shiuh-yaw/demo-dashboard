"use client";

/**
 * KYC Gate Page
 *
 * Uses shared AuthLayout (logo + footer) — same as login.
 * Matches remittance layout: centered card, Log out link below.
 */

import { useCallback } from "react";
import { AuthLayout } from "@dynamic-demos/ui";
import { KycGateScreen } from "@/components/screens/kyc-gate-screen";
import { useLogout } from "@/hooks/use-mutations";
import { AppLogo } from "@/components/ui/app-logo";

export function KycGatePage() {
  const logoutMutation = useLogout();

  const handleComplete = useCallback(() => {
    // Full navigation to force fresh server render with updated KYC status
    window.location.href = "/portfolio";
  }, []);

  return (
    <AuthLayout logo={<AppLogo size={40} />}>
      <div className="w-full space-y-3">
        <KycGateScreen onComplete={handleComplete} />
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
