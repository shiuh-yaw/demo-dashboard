"use client";

import { useClientInitialized } from "@/hooks/use-client-initialized";
import { Spinner } from "@dynamic-demos/ui";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const isClientReady = useClientInitialized();

  if (!isClientReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-(--widget-page-bg)">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--widget-page-bg)">
      <DashboardHeader />
      <div
        className="mx-auto px-8 py-8"
        style={{ maxWidth: "var(--max-width-content)" }}
      >
        {children}
      </div>
      <div className="text-center py-3 text-xs text-(--widget-muted)">
        Sandbox environment · No real funds or transactions
      </div>
    </div>
  );
}
