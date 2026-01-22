"use client";

/**
 * Transactions Tab Component
 *
 * Displays a paginated list of transactions with status filtering.
 */

import { type Transaction } from "@/lib/types/dashboard";
import { useTransactions } from "./transactions/use-transactions";
import { TransactionsFilters } from "./transactions/transactions-filters";
import { TransactionsTable } from "./transactions/transactions-table";
import { TransactionsPagination } from "./transactions/transactions-pagination";

interface TransactionsTabProps {
  checkoutId: string;
  initialTransactions: Transaction[];
  initialTotal: number;
  isLoading?: boolean;
}

export function TransactionsTab({
  checkoutId,
  initialTransactions,
  initialTotal,
  isLoading: initialLoading,
}: TransactionsTabProps) {
  const {
    transactions,
    total,
    page,
    totalPages,
    statusFilter,
    searchQuery,
    isLoading,
    handleStatusChange,
    handleSearchChange,
    handlePageChange,
  } = useTransactions({
    checkoutId,
    initialTransactions,
    initialTotal,
    initialLoading,
  });

  return (
    <div className="space-y-4">
      <TransactionsFilters
        statusFilter={statusFilter}
        searchQuery={searchQuery}
        total={total}
        onStatusChange={handleStatusChange}
        onSearchChange={handleSearchChange}
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <TransactionsTable
          transactions={transactions}
          checkoutId={checkoutId}
          isLoading={isLoading}
        />
      </div>

      <TransactionsPagination
        page={page}
        totalPages={totalPages}
        isLoading={isLoading}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
