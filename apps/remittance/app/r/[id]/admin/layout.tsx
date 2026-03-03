import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { getAdminNavItems } from "@/lib/nav-items";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { getServerUserData } from "@/lib/auth/server-auth";

export const metadata: Metadata = {
  title: "Remittance Admin — Fireblocks + Dynamic",
  description: "Admin dashboard for managing vaults, users, and transfers",
};

export default async function ConfigAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loginPath = `/r/${id}/login`;
  const basePath = `/r/${id}`;

  const userData = await getServerUserData({
    redirectToLogin: true,
    loginPath,
  });
  if (!userData) return null;

  if (!userData.kycApproved) {
    redirect(`/r/${id}/kyc?returnTo=${encodeURIComponent(`${basePath}/admin`)}`);
  }

  return (
    <DashboardLayout
      header={
        <DashboardHeader
          navItems={getAdminNavItems(basePath)}
          walletAddress={userData.walletAddress ?? undefined}
          brandHref={`${basePath}/dashboard`}
          brandLabel="Remittance Admin"
        />
      }
    >
      <div className="max-w-5xl mx-auto">{children}</div>
    </DashboardLayout>
  );
}
