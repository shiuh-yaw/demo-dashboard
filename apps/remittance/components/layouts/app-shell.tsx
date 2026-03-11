"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useClientInitialized } from "@/hooks/use-client-initialized";
import { usePrimaryWallet } from "@/hooks/use-primary-wallet";
import {
  createWaasWalletAccounts,
  getChainsMissingWaasWalletAccounts,
} from "@/lib/dynamic";
import { WidgetCard, Spinner } from "@dynamic-demos/ui";
import { WidgetLayout } from "@/components/ui/widget-layout";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export interface AppShellProps {
  /** Server-resolved wallet address from Dynamic user. */
  initialWalletAddress?: string;
  /** Page content — rendered when ready. */
  children: React.ReactNode;
}

/**
 * App shell: dashboard layout. Renders children when client is ready.
 * Auth and KYC are handled by route-level redirects in (app) and (auth) layouts.
 */
export function AppShell({ initialWalletAddress, children }: AppShellProps) {
  const isClientReady = useClientInitialized();
  const isLoggedIn = useAuth();
  const queryClient = useQueryClient();
  const { walletAddress: clientWalletAddress, isLoading } = usePrimaryWallet();
  const walletAddress = clientWalletAddress || initialWalletAddress || "";
  const hasAttemptedAutoCreate = useRef(false);

  useEffect(() => {
    if (
      !isClientReady ||
      !isLoggedIn ||
      walletAddress ||
      isLoading ||
      hasAttemptedAutoCreate.current
    ) {
      return;
    }

    hasAttemptedAutoCreate.current = true;

    const missingChains = getChainsMissingWaasWalletAccounts();
    if (missingChains.length > 0) {
      createWaasWalletAccounts({ chains: missingChains })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["walletAccounts"] });
        })
        .catch(() => {
          hasAttemptedAutoCreate.current = false;
        });
    }
  }, [isClientReady, isLoggedIn, walletAddress, isLoading, queryClient]);

  if (!isClientReady) {
    return (
      <WidgetLayout>
        <WidgetCard>
          <div className="flex items-center justify-center min-h-64">
            <Spinner size="lg" />
          </div>
        </WidgetCard>
      </WidgetLayout>
    );
  }

  return (
    <DashboardLayout header={<DashboardHeader walletAddress={walletAddress} />}>
      {children}
    </DashboardLayout>
  );
}
