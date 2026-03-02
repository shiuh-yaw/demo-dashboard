/**
 * Dashboard Layout
 *
 * Layout for authenticated dashboard pages.
 * PayoutDemoProvider gives SE demo state (localStorage, reset from user menu).
 * CreatorBalanceProvider shares Total balance with Add funds (same logic).
 * EarnConfigProvider provides default branding (Dynamic logo, no sidebar).
 */

import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { PayoutDemoProvider } from "@/contexts/payout-demo-context";
import { CreatorBalanceProvider } from "@/contexts/creator-balance-context";
import { EarnConfigProvider } from "@/contexts/earn-config-context";
import { getCurrentUser } from "@/lib/auth/session";
import type { EarnConfig } from "@/lib/earn-config";

/** Default config hides sidebar for cleaner demo view */
const DEFAULT_LAYOUT_CONFIG: EarnConfig = {
  layout: { showSidebar: false },
  branding: {
    logo: "custom",
    logoUrl:
      "https://cdn.prod.website-files.com/626692727bba3f384e008e8a/693845111bc07ac641926138_714a9e2b8dc77b2e4cd11c533e83ba38_logo.svg",
    tokenName: "USDC",
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // If user is null (invalid/expired token), redirect to login
  // The stale cookie will be replaced when user authenticates again
  if (!user) redirect("/login");

  return (
    <EarnConfigProvider config={DEFAULT_LAYOUT_CONFIG}>
      <PayoutDemoProvider>
        <CreatorBalanceProvider>
          <div className="min-h-screen bg-earn-light flex flex-col">
            <Header user={user} />
            <div className="flex flex-1 pt-14">
              <main className="flex-1">{children}</main>
            </div>
          </div>
        </CreatorBalanceProvider>
      </PayoutDemoProvider>
    </EarnConfigProvider>
  );
}
