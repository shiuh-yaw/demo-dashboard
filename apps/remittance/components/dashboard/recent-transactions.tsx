"use client";

import {
  RefreshCw,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Skeleton,
} from "@dynamic-demos/ui";
import { useTransactionHistory } from "@/hooks/use-transaction-history";
import { truncateAddress } from "@dynamic-demos/utils";
import {
  getCounterpartyDisplayLabel,
  buildAddressToEmailMap,
} from "@/lib/deposit-addresses";
import { TxTime } from "@/components/dashboard/transaction-time";
import type { TxItem } from "@/hooks/use-transaction-history";
import type { RecipientEntry } from "@/lib/recipients";

interface RecentTransactionsProps {
  walletAddress: string;
  networkId: number;
  /** Server-fetched transactions for initial render. */
  initialTransactions?: TxItem[];
  /** Withdraw vault address for display as "Withdraw" in transaction history. */
  withdrawVaultAddress?: string | null;
  /** Known recipients for display as email instead of address. */
  recipients?: RecipientEntry[];
}

export function RecentTransactions({
  walletAddress,
  networkId,
  initialTransactions,
  withdrawVaultAddress,
  recipients = [],
}: RecentTransactionsProps) {
  const { transactions, isLoading, isFetching, refetch } =
    useTransactionHistory(walletAddress, networkId, 5, {
      initialData: initialTransactions,
    });
  const addressToEmail = buildAddressToEmailMap(recipients);

  return (
    <Card>
      <CardHeader
        className="px-4 pb-0 pt-5 sm:px-5"
        title="Recent Transactions"
        action={
          <div className="flex items-center gap-2">
            {isFetching && (
              <span className="text-xs text-(--widget-muted)">Updating…</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        }
      />
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-3 px-4 pt-3 pb-5 sm:px-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center px-4 py-8 sm:px-5">
            <p className="text-sm text-(--widget-muted)">No transactions yet</p>
            <p className="text-xs text-(--widget-muted)/60 mt-1">
              Send or receive USDC to see activity here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-(--widget-border)">
            {transactions.map((tx) => (
              <RecentTxRow
                key={tx.hash}
                tx={tx}
                walletAddress={walletAddress}
                withdrawVaultAddress={withdrawVaultAddress}
                addressToEmail={addressToEmail}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentTxRow({
  tx,
  walletAddress,
  withdrawVaultAddress,
  addressToEmail,
}: {
  tx: TxItem;
  walletAddress: string;
  withdrawVaultAddress?: string | null;
  addressToEmail?: Record<string, string>;
}) {
  const isSent = tx.from.toLowerCase() === walletAddress.toLowerCase();
  const counterparty = isSent ? tx.to : tx.from;

  return (
    <a
      href={`https://sepolia.basescan.org/tx/${tx.hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-3 px-4 py-3.5 hover:bg-(--widget-row-hover) transition-colors group sm:flex-row sm:items-center sm:gap-4 sm:px-5"
    >
      {/* Top row (mobile) / Left + Middle (desktop) */}
      <div className="flex items-center justify-between gap-3 min-w-0 sm:flex-1 sm:justify-start">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center sm:w-10 sm:h-10 ${
              isSent
                ? "bg-red-50 text-(--widget-error)"
                : "bg-green-50 text-(--widget-success)"
            }`}
          >
            {isSent ? (
              <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-(--widget-fg)">
              {isSent ? "Sent" : "Received"}
            </p>
            <p className="text-xs text-(--widget-muted)">
              <TxTime timestamp={tx.timestamp} />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 sm:flex-1 sm:justify-center">
          <span className="inline-flex items-center rounded-md bg-(--widget-row-bg) px-2 py-0.5 text-xs font-medium text-(--widget-muted)">
            {tx.asset}
          </span>
          <span
            className={`text-sm font-semibold tabular-nums ${
              isSent ? "text-(--widget-error)" : "text-(--widget-success)"
            }`}
          >
            {isSent ? "-" : "+"}
            {tx.value} {tx.asset}
          </span>
        </div>
      </div>

      {/* Bottom row (mobile) / Right (desktop) */}
      <div className="flex items-center justify-between gap-2 sm:flex-1 sm:justify-end">
        <div className="min-w-0 sm:text-right">
          <p className="text-xs text-(--widget-muted)">
            {isSent ? "To" : "From"}
          </p>
          <p className="text-sm font-mono text-(--widget-fg) truncate">
            {getCounterpartyDisplayLabel(counterparty, {
              withdrawVaultAddress,
              addressToEmail,
            }) ?? truncateAddress(counterparty)}
          </p>
        </div>
        <ExternalLink className="w-4 h-4 shrink-0 text-(--widget-muted) transition-colors group-hover:text-(--widget-accent)" />
      </div>
    </a>
  );
}
