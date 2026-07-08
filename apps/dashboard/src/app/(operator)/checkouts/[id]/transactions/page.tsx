/**
 * Checkout Transactions Page (Server Component)
 *
 * Lists all transactions for a checkout with server-side data fetching.
 */

import { transactionService } from "@/lib/services";
import { TransactionsTab } from "../../components/management/transactions-tab";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CheckoutTransactionsPage({ params }: PageProps) {
  const { id } = await params;

  // Fetch transactions server-side
  const result = await transactionService
    .list(id, { pageSize: 20 })
    .catch(() => ({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    }));

  return (
    <TransactionsTab
      checkoutId={id}
      initialTransactions={result.items}
      initialTotal={result.total}
    />
  );
}
