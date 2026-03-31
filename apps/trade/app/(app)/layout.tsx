/**
 * App Layout
 *
 * Server component: checks auth, KYC, and wallet selection status.
 * - If not authenticated, redirects to login.
 * - If KYC not complete, renders KycGatePage.
 * - If wallet selection enabled and not yet selected, renders WalletSelectionPage.
 * - Otherwise renders AppShell with children.
 */

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getServerUserData } from "@/lib/auth/server-auth";
import { AppShell } from "@/components/layouts/app-shell";
import { KycGatePage } from "./kyc-gate-page";
import { WalletSelectionPage } from "./wallet-selection-page";
import { appConfig } from "@/app.config";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const userData = await getServerUserData();

  if (!userData) {
    const pathname = headersList.get("x-pathname") ?? "/portfolio";
    const returnTo = pathname.replace(/\/$/, "") || "/portfolio";
    const loginUrl = `/login?returnTo=${encodeURIComponent(returnTo)}&sessionExpired=1`;
    redirect(loginUrl);
  }

  // KYC gate: if not approved, show KYC gate screen (matches remittance layout)
  if (!userData.kycApproved) {
    return <KycGatePage />;
  }

  // Wallet selection: if enabled and user has not selected, show wallet selector
  if (appConfig.walletSelection && !userData.walletType) {
    return <WalletSelectionPage />;
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-lg lg:max-w-5xl pb-8 w-full">
        {children}
      </div>
    </AppShell>
  );
}
