import { AppShell } from "@/components/layouts/app-shell";
import { getServerUserData } from "@/lib/auth/server-auth";
import { KycGatePage } from "@/app/(app)/kyc-gate-page";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ConfigDashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { id } = await params;
  const loginPath = `/r/${id}/login`;

  const data = await getServerUserData({
    redirectToLogin: true,
    loginPath,
  });
  if (!data) return null;

  if (!data.kycApproved) {
    return <KycGatePage />;
  }

  return (
    <AppShell initialWalletAddress={data.walletAddress ?? undefined}>
      {children}
    </AppShell>
  );
}
