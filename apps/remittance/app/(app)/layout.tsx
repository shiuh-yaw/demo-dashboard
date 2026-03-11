import { AppShell } from "@/components/layouts/app-shell";
import { getServerUserData } from "@/lib/auth/server-auth";
import { KycGatePage } from "./kyc-gate-page";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getServerUserData();
  // getServerUserData() redirects to /login when unauthenticated
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
