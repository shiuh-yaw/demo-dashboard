"use client";

import { Zap } from "lucide-react";
import { useClientInitialized } from "@/hooks/use-client-initialized";
import { WidgetCard, Spinner } from "@dynamic-demos/ui";
import { WidgetLayout } from "@/components/ui/widget-layout";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PayoutModal } from "@/components/screens/payout-modal";
import { PayoutProvider, usePayoutContext } from "@/contexts/payout-context";

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Inner shell — rendered inside PayoutProvider so it can access PayoutContext.
 */
function AppShellInner({ children }: AppShellProps) {
  const isClientReady = useClientInitialized();
  const { isModalOpen, openModal, closeModal } = usePayoutContext();

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
    <DashboardLayout header={<DashboardHeader />}>
      {children}

      {/* Fixed "Simulate payout" button — always visible inside (app) layout */}
      <button
        onClick={openModal}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-(--brand-primary) text-white text-sm font-semibold shadow-lg transition-all hover:opacity-90 active:scale-95"
        aria-label="Simulate payout"
      >
        <Zap className="w-4 h-4" />
        Simulate payout
      </button>

      {/* Payout modal — Phase 1 stub */}
      <PayoutModal isOpen={isModalOpen} onClose={closeModal} />
    </DashboardLayout>
  );
}

/**
 * App shell: wraps the dashboard layout with PayoutProvider and DynamicInit listener.
 * Auth is handled by route-level redirects in (app) layout.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <PayoutProvider>
      <AppShellInner>{children}</AppShellInner>
    </PayoutProvider>
  );
}
