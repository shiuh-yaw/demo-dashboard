import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { getServerUserData } from "@/lib/auth/server-auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getServerUserData();
  // getServerUserData() redirects to /login when unauthenticated
  if (!data) return null;
  if (!data.kycApproved) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? "/";
    const returnTo = encodeURIComponent(
      pathname.startsWith("/") ? pathname : `/${pathname}`,
    );
    redirect(`/kyc?returnTo=${returnTo}`);
  }

  return (
    <AppShell initialWalletAddress={data.walletAddress ?? undefined}>
      {children}
    </AppShell>
  );
}
