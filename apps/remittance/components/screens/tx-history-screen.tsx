"use client";

import { useEffect, useRef } from "react";
import {
  RefreshCw,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { Card, CardContent, Button, Spinner } from "@dynamic-demos/ui";
import {
  useInfiniteTransactionHistory,
  type TxItem,
} from "@/hooks/use-transaction-history";
import { truncateAddress } from "@dynamic-demos/utils";
import {
  getCounterpartyDisplayLabel,
  buildAddressToEmailMap,
} from "@/lib/deposit-addresses";
import { TxTime, parseTxDate } from "@/components/transaction-time";
import type { NavigationReturn } from "@/hooks/use-navigation";
import type { RecipientEntry } from "@/lib/recipients";

interface TxHistoryScreenProps {
  walletAddress: string;
  networkId: number;
  /** Used when rendered in modal (e.g. from Overview). Optional when used as standalone page. */
  navigation?: NavigationReturn;
  /** Server-fetched transactions for initial render. */
  initialTransactions?: TxItem[];
  /** Withdraw vault address for display as "Withdraw" in transaction history. */
  withdrawVaultAddress?: string | null;
  /** Known recipients for display as email instead of address. */
  recipients?: RecipientEntry[];
}

function groupByDate(transactions: TxItem[]): [string, TxItem[]][] {
  const groups = new Map<string, { date: Date; txs: TxItem[] }>();
  for (const tx of transactions) {
    const date = parseTxDate(tx.timestamp);
    const key = date
      ? date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Unknown";
    const entry = groups.get(key) ?? {
      date: date ?? new Date(0),
      txs: [],
    };
    entry.txs.push(tx);
    groups.set(key, entry);
  }
  return Array.from(groups.entries())
    .sort((a, b) => b[1].date.getTime() - a[1].date.getTime())
    .map(([label, { txs }]) => [label, txs]);
}

export function TxHistoryScreen({
  walletAddress,
  networkId,
  navigation: _navigation,
  initialTransactions,
  withdrawVaultAddress,
  recipients = [],
}: TxHistoryScreenProps) {
  const {
    transactions,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteTransactionHistory(walletAddress, networkId, {
    initialData: initialTransactions,
  });

  const addressToEmail = buildAddressToEmailMap(recipients);
  const grouped = groupByDate(transactions);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-(--widget-fg) sm:text-2xl">
            Transaction History
          </h1>
          <p className="text-sm text-(--widget-muted) mt-1">
            Recent Base Sepolia transactions
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-(--widget-muted)">
                No transactions found
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-(--widget-border)">
                {grouped.map(([dateLabel, txs]) => (
                  <div key={dateLabel}>
                    <h2 className="px-4 pt-4 pb-2 text-sm font-semibold text-(--widget-fg) sm:px-5">
                      {dateLabel}
                    </h2>
                    <div className="divide-y divide-(--widget-border)/80">
                      {txs.map((tx) => (
                        <TxRow
                          key={tx.hash}
                          tx={tx}
                          walletAddress={walletAddress}
                          withdrawVaultAddress={withdrawVaultAddress}
                          addressToEmail={addressToEmail}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div
                ref={loadMoreRef}
                className="flex flex-col items-center gap-2 py-4 border-t border-(--widget-border)"
              >
                {hasNextPage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span className="ml-2">Loading...</span>
                      </>
                    ) : (
                      "Load more"
                    )}
                  </Button>
                ) : (
                  <p className="text-xs text-(--widget-muted)">
                    Showing all {transactions.length} transaction
                    {transactions.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TxRow({
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
  const label = getCounterpartyDisplayLabel(counterparty, {
    withdrawVaultAddress,
    addressToEmail,
  });

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
        <div className="min-w-0">
          <p className="text-xs text-(--widget-muted)">
            {isSent ? "To" : "From"}
          </p>
          <p className="text-sm font-mono text-(--widget-fg) truncate">
            {label ?? truncateAddress(counterparty)}
          </p>
        </div>
        <ExternalLink className="w-4 h-4 shrink-0 text-(--widget-muted) transition-colors group-hover:text-(--widget-accent)" />
      </div>
    </a>
  );
}
