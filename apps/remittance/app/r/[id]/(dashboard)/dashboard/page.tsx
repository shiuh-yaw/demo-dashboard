import { getServerUserData } from "@/lib/auth/server-auth";
import { getServerTransactionHistory } from "@/lib/transactions/server";
import { getServerUsdcBalance } from "@/lib/balance/server";
import { BASE_SEPOLIA_CHAIN_ID } from "@/lib/constants";
import { OverviewPage } from "@/components/overview-page";

const RECENT_TX_LIMIT = 5;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConfigDashboardPage({ params }: PageProps) {
  const { id } = await params;
  const userData = await getServerUserData({
    redirectToLogin: true,
    loginPath: `/r/${id}/login`,
  });
  const walletAddress = userData?.walletAddress ?? null;

  const [transactions, usdcBalance] = await Promise.all([
    getServerTransactionHistory(
      walletAddress,
      BASE_SEPOLIA_CHAIN_ID,
      RECENT_TX_LIMIT,
    ),
    getServerUsdcBalance(walletAddress),
  ]);

  return (
    <OverviewPage
      walletAddress={walletAddress ?? ""}
      networkId={BASE_SEPOLIA_CHAIN_ID}
      initialUsdcBalance={usdcBalance}
      initialTransactions={transactions}
      hasSubmittedBankDetails={userData?.hasSubmittedBankDetails ?? false}
      initialWithdrawVaultAddress={userData?.withdrawVaultAddress ?? null}
      initialRecipients={userData?.knownRecipients ?? []}
      initialStubCard={userData?.stubCard ?? null}
      initialCardBalance={userData?.cardDeposits ?? 0}
      initialSaveBalance={userData?.saveDeposits ?? 0}
      initialKycApproved={userData?.kycApproved ?? false}
    />
  );
}
