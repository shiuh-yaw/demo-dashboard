import type { Metadata } from "next";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ADMIN_NAV_ITEMS } from "@/lib/nav-items";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { getServerUserData } from "@/lib/auth/server-auth";

import "../globals.css";

export const metadata: Metadata = {
  title: "Remittance Admin — Fireblocks + Dynamic",
  description: "Admin dashboard for managing vaults, users, and transfers",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userData = await getServerUserData();
  const walletAddress = userData?.walletAddress ?? undefined;

  return (
    <DashboardLayout
      header={
        <DashboardHeader
          navItems={ADMIN_NAV_ITEMS}
          walletAddress={walletAddress}
          brandHref="/admin"
          brandLabel="Remittance Admin"
        />
      }
    >
      <div className="max-w-5xl mx-auto">{children}</div>
    </DashboardLayout>
  );
}
