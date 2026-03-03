import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { getServerUserData } from "@/lib/auth/server-auth";

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
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? `/r/${id}/dashboard`;
    const returnTo = encodeURIComponent(
      pathname.startsWith("/") ? pathname : `/${pathname}`,
    );
    redirect(`/r/${id}/kyc?returnTo=${returnTo}`);
  }

  return (
    <AppShell initialWalletAddress={data.walletAddress ?? undefined}>
      {children}
    </AppShell>
  );
}
