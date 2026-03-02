/**
 * Dashboard Layout for /e/[id]
 *
 * Layout for authenticated dashboard pages with custom config.
 * Includes header and sidebar (controlled by config).
 */

import { redirect } from "next/navigation";
import { PayoutDemoProvider } from "@/contexts/payout-demo-context";
import { CreatorBalanceProvider } from "@/contexts/creator-balance-context";
import { getCurrentUser } from "@/lib/auth/session";
import { DashboardLayoutClient } from "./dashboard-layout-client";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  // If user is null (invalid/expired token), redirect to login with config ID
  if (!user) redirect(`/e/${id}/login`);

  return (
    <PayoutDemoProvider>
      <CreatorBalanceProvider>
        <DashboardLayoutClient user={user} configId={id}>
          {children}
        </DashboardLayoutClient>
      </CreatorBalanceProvider>
    </PayoutDemoProvider>
  );
}
