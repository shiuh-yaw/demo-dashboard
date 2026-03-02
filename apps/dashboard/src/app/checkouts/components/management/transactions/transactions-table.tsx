import { type Transaction } from "@/lib/types/dashboard";
import { TransactionRow } from "./transaction-row";

interface TransactionsTableProps {
  transactions: Transaction[] | undefined;
  checkoutId: string;
  isLoading: boolean;
}

export function TransactionsTable({
  transactions,
  checkoutId,
  isLoading,
}: TransactionsTableProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse divide-y divide-slate-100">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-5 py-4 h-16" />
        ))}
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-slate-500">No transactions found</p>
      </div>
    );
  }

  return (
    <>
      {/* Table Header */}
      <div className="grid grid-cols-[100px_1fr_140px_150px_120px_100px_80px] px-5 py-3 bg-slate-50 border-b border-slate-100 items-center">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
          Date
        </span>
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
          Transaction
        </span>
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
          External ID
        </span>
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
          Payment Amount
        </span>
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
          Wallet
        </span>
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
          Status
        </span>
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide text-right">
          Actions
        </span>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-slate-100">
        {(transactions || []).map((tx) => (
          <TransactionRow
            key={tx.id}
            transaction={tx}
            checkoutId={checkoutId}
          />
        ))}
      </div>
    </>
  );
}
