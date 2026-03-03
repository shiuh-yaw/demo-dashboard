import { getServerUserData } from "@/lib/auth/server-auth";
import { getServerTransactionHistory } from "@/lib/transactions/server";
import { BASE_SEPOLIA_CHAIN_ID } from "@/lib/constants";
import { HistoryPageClient } from "@/components/history-page-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConfigHistoryPage({ params }: PageProps) {
  const { id } = await params;
  const userData = await getServerUserData({
    redirectToLogin: true,
    loginPath: `/r/${id}/login`,
  });
  const walletAddress = userData?.walletAddress ?? "";
  const transactions = await getServerTransactionHistory(
    walletAddress,
    BASE_SEPOLIA_CHAIN_ID,
    25,
  );

  return (
    <HistoryPageClient
      walletAddress={walletAddress}
      networkId={BASE_SEPOLIA_CHAIN_ID}
      initialTransactions={transactions}
      initialKycApproved={userData?.kycApproved ?? false}
      withdrawVaultAddress={userData?.withdrawVaultAddress ?? null}
      recipients={userData?.knownRecipients ?? []}
    />
  );
}
