"use client";

import { useRouter } from "next/navigation";
import { useNavigation } from "@/hooks/use-navigation";
import { useAuth } from "@/hooks/use-auth";
import { TxHistoryScreen } from "@/components/screens/tx-history-screen";
import type { TxItem } from "@/hooks/use-transaction-history";
import type { RecipientEntry } from "@/lib/recipients";

interface HistoryPageClientProps {
  walletAddress: string;
  networkId: number;
  initialTransactions?: TxItem[];
  /** Server-resolved KYC status. Skips /api/kyc/status fetch when true. */
  initialKycApproved?: boolean;
  /** Withdraw vault address for display as "Withdraw" in transaction history. */
  withdrawVaultAddress?: string | null;
  /** Known recipients for display as email instead of address. */
  recipients?: RecipientEntry[];
}

export function HistoryPageClient({
  walletAddress,
  networkId,
  initialTransactions,
  initialKycApproved,
  withdrawVaultAddress,
  recipients = [],
}: HistoryPageClientProps) {
  const router = useRouter();
  const isLoggedIn = useAuth();
  const navigation = useNavigation(isLoggedIn, { initialKycApproved });
  const pageNavigation = {
    ...navigation,
    goToDashboard: () => router.push("/"),
  };

  return (
    <TxHistoryScreen
      walletAddress={walletAddress}
      networkId={networkId}
      navigation={pageNavigation}
      initialTransactions={initialTransactions}
      withdrawVaultAddress={withdrawVaultAddress}
      recipients={recipients}
    />
  );
}
