import { TransactionHistoryScreen } from "@/components/screens/transaction-history-screen";
import { getServerPreferences } from "@/lib/preferences/server";
import { fetchTransactionsForWallet } from "@/lib/transactions/server";

// Every visit hits Fireblocks — opt out of the Next.js route cache so
// order status reflects the live state of the user's account.
export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const { walletAddress } = await getServerPreferences();
  const { transactions, source } = await fetchTransactionsForWallet(walletAddress);

  return (
    <TransactionHistoryScreen
      transactions={transactions}
      source={source}
      walletAddress={walletAddress}
      fetchedAt={Date.now()}
    />
  );
}
