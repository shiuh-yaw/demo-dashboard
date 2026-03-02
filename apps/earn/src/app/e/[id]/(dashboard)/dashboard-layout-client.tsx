"use client";

/**
 * Dashboard Layout Client Component
 *
 * Client wrapper for the dashboard layout that handles
 * config-based sidebar visibility.
 */

import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { useEarnConfig } from "@/contexts/earn-config-context";
import type { DynamicJwtPayload } from "@/lib/auth/dynamic-jwt";

interface DashboardLayoutClientProps {
  children: React.ReactNode;
  user: DynamicJwtPayload;
  configId: string;
}

export function DashboardLayoutClient({
  children,
  user,
  configId,
}: DashboardLayoutClientProps) {
  const { layout } = useEarnConfig();

  return (
    <div className="min-h-screen bg-earn-light flex flex-col">
      <Header user={user} />
      <div className="flex flex-1 pt-14">
        {layout.showSidebar && (
          <Sidebar className="hidden sm:flex" configId={configId} />
        )}
        <main className={`flex-1 ${layout.showSidebar ? "sm:ml-16" : ""}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
