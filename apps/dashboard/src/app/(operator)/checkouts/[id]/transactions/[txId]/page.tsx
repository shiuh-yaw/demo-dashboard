/**
 * Transaction Detail Page (Server Component)
 *
 * Shows detailed information for a single transaction.
 */

import { transactionService } from "@/lib/services";
import { notFound } from "next/navigation";
import { TransactionDetail } from "../../../components/management/transaction-detail";

interface PageProps {
  params: Promise<{ id: string; txId: string }>;
}

export default async function TransactionDetailPage({ params }: PageProps) {
  const { id: checkoutId, txId } = await params;

  // Fetch transaction server-side
  const transaction = await transactionService.get(txId);

  if (!transaction || transaction.checkoutId !== checkoutId) {
    notFound();
  }

  return (
    <TransactionDetail transaction={transaction} checkoutId={checkoutId} />
  );
}
