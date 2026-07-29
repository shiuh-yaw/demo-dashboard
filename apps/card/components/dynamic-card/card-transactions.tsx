"use client";

/**
 * Rain transaction history, restyled to wallet's row idiom
 * (apps/wallet/components/screens/tx-history-screen.tsx's TransactionRow) -
 * rewired onto `useTransactions` (dashboard-mediated read, hard rule 3)
 * instead of a direct `/api/transactions` fetch with a bearer token.
 */

import { History } from "lucide-react";
import { Spinner } from "@dynamic-demos/ui";
import type { TransactionResponse } from "@dynamic-demos/rain";

import { useTransactions } from "@/hooks/use-transactions";

import { SpendTransaction } from "./transactions/spend";
import { DepositTransaction } from "./transactions/deposit";
import { PaymentTransaction } from "./transactions/payment";
import { FeeTransaction } from "./transactions/fee";

export interface TransactionsListProps {
  enabled: boolean;
}

function TransactionRow({
  transaction,
}: {
  transaction: TransactionResponse;
}) {
  switch (transaction.type) {
    case "spend":
      return <SpendTransaction transaction={transaction} />;
    case "collateral":
      return <DepositTransaction transaction={transaction} />;
    case "payment":
      return <PaymentTransaction transaction={transaction} />;
    case "fee":
      return <FeeTransaction transaction={transaction} />;
    default:
      return null;
  }
}

export function TransactionsList({ enabled }: TransactionsListProps) {
  const { data, isLoading } = useTransactions(enabled);
  const transactions = data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center py-6 gap-1.5">
        <div className="w-10 h-10 rounded-full bg-(--brand-row-bg) flex items-center justify-center mb-1">
          <History
            className="w-5 h-5 text-(--brand-muted)"
            strokeWidth={1.5}
          />
        </div>
        <p className="text-sm font-medium text-(--brand-fg)">
          No transactions
        </p>
        <p className="text-xs text-(--brand-muted) text-center max-w-[220px]">
          Your transaction history will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {transactions.map((transaction) => (
        <TransactionRow key={transaction.id} transaction={transaction} />
      ))}
    </div>
  );
}
