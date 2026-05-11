"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileCode, RefreshCw, Wallet } from "lucide-react";
import { ApiPayloadDrawer } from "@/components/screens/api-payload-drawer";
import { truncateAddress } from "@/lib/format";
import type { TransactionRecord } from "@/lib/transactions/server";

/* ── Status badge ─────────────────────────────────────────────────── */

type StatusVariant = "completed" | "pending" | "failed" | "rejected" | "info" | "neutral";

const STATUS_MAP: Record<string, { label: string; variant: StatusVariant }> = {
  // Fireblocks order statuses
  COMPLETED:           { label: "Completed",  variant: "completed" },
  PROCESSING:          { label: "Processing", variant: "pending" },
  PENDING_USER_ACTION: { label: "Pending",    variant: "pending" },
  AWAITING_PAYMENT:    { label: "Pending",    variant: "pending" },
  CREATED:             { label: "Submitted",  variant: "info" },
  FAILED:              { label: "Failed",     variant: "failed" },
  CANCELED:            { label: "Cancelled",  variant: "neutral" },
  // Mock data statuses (fallback)
  EXECUTION_COMPLETED: { label: "Completed",  variant: "completed" },
  EXECUTION_PENDING:   { label: "Pending",    variant: "pending" },
  EXECUTION_FAILED:    { label: "Failed",     variant: "failed" },
  EXECUTION_REJECTED:  { label: "Rejected",   variant: "rejected" },
};

function StatusBadge({ status }: { status: string }) {
  const v = STATUS_MAP[status] ?? { label: status, variant: "neutral" as StatusVariant };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{
        backgroundColor: `var(--brand-status-${v.variant}-bg)`,
        color: `var(--brand-status-${v.variant}-fg)`,
      }}
    >
      {v.label}
    </span>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ── Row ──────────────────────────────────────────────────────────── */

interface TransactionRowProps {
  tx: TransactionRecord;
  onViewPayload: (tx: TransactionRecord) => void;
}

function TransactionRow({ tx, onViewPayload }: TransactionRowProps) {
  const amountNum = parseFloat(tx.amount);
  const amountDisplay = isNaN(amountNum) ? tx.amount : amountNum.toLocaleString();

  return (
    <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-(--brand-row-hover) transition-colors">
      <div className="w-28 shrink-0">
        <p className="text-sm font-semibold text-(--brand-fg)">
          {amountDisplay} {tx.asset}
        </p>
        <p className="text-xs text-(--brand-muted)">{tx.blockchain}</p>
      </div>

      <div className="w-24 shrink-0">
        <StatusBadge status={tx.status} />
      </div>

      <div className="flex-1 min-w-0 hidden sm:block">
        <p className="text-xs text-(--brand-muted) truncate">
          <span className="font-medium text-(--brand-fg)">VD</span>{" "}
          {tx.visaDirectTxId}
        </p>
        <p className="text-xs text-(--brand-muted) truncate">
          <span className="font-medium text-(--brand-fg)">FB</span>{" "}
          {truncateAddress(tx.fireblocksId)}
        </p>
      </div>

      <div className="w-24 shrink-0 hidden md:block">
        <p className="text-xs font-mono text-(--brand-muted)">
          {truncateAddress(tx.recipientWallet)}
        </p>
      </div>

      <div className="w-24 shrink-0 text-right hidden sm:block">
        <p className="text-xs text-(--brand-muted)">{formatDate(tx.timestamp)}</p>
      </div>

      <button
        onClick={() => onViewPayload(tx)}
        className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-(--brand-radius) border border-(--brand-border) text-xs text-(--brand-muted) hover:text-(--brand-fg) hover:bg-(--brand-row-bg) transition-colors"
        aria-label="View API payload"
      >
        <FileCode className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">View payload</span>
      </button>
    </div>
  );
}

/* ── Screen ───────────────────────────────────────────────────────── */

/**
 * Transaction history screen.
 *
 * Pure client component that renders data already fetched by its
 * parent server component (`/transactions/page.tsx`). The refresh
 * button triggers `router.refresh()`, which re-runs the server
 * component in place and streams the updated tree back — no client
 * data fetching, no separate API route.
 */
interface TransactionHistoryScreenProps {
  transactions: TransactionRecord[];
  source: "live" | "mock";
  walletAddress: string | null;
  /** Server timestamp for the fetch, used to render "Updated at…". */
  fetchedAt: number;
}

export function TransactionHistoryScreen({
  transactions,
  source,
  walletAddress,
  fetchedAt,
}: TransactionHistoryScreenProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null);

  // Format the server timestamp client-side. Rendering nothing on
  // the server keeps the first paint deterministic — otherwise the
  // user's locale / timezone would cause a hydration mismatch.
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState("");
  useEffect(() => {
    setLastUpdatedLabel(
      new Date(fetchedAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    );
  }, [fetchedAt]);

  const canRefresh = !!walletAddress && !isRefreshing;

  function handleRefresh() {
    startRefresh(() => {
      router.refresh();
    });
  }

  return (
    <>
      <div>
        {/* Page heading */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-(--brand-fg)">
              Transaction history
            </h1>
            <p className="text-sm text-(--brand-muted) mt-1">
              {walletAddress
                ? `Payouts to ${truncateAddress(walletAddress)}`
                : "Past payouts processed via Visa Direct and Fireblocks"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={!canRefresh}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-(--brand-radius) border border-(--brand-border) text-xs text-(--brand-muted) hover:text-(--brand-fg) hover:bg-(--brand-row-bg) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh transactions"
            title={
              lastUpdatedLabel ? `Last updated ${lastUpdatedLabel}` : "Refresh"
            }
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>{isRefreshing ? "Refreshing…" : "Refresh"}</span>
          </button>
        </div>

        {/* No wallet configured */}
        {!walletAddress && transactions.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <Wallet className="w-8 h-8 text-(--brand-muted)" />
            <p className="text-sm font-medium text-(--brand-fg)">No wallet connected</p>
            <p className="text-xs text-(--brand-muted)">
              Connect or create a stablecoin wallet to see your payout history.
            </p>
          </div>
        )}

        {/* Empty — wallet connected but no matching orders */}
        {walletAddress && transactions.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <FileCode className="w-8 h-8 text-(--brand-muted)" />
            <p className="text-sm font-medium text-(--brand-fg)">No transactions yet</p>
            <p className="text-xs text-(--brand-muted)">
              Payouts sent to your wallet will appear here.
            </p>
          </div>
        )}

        {/* Table */}
        {transactions.length > 0 && (
          <div className="rounded-(--brand-radius-lg) border border-(--brand-border) bg-(--brand-bg) overflow-hidden">
            {/* Column headers */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-b border-(--brand-border) bg-(--brand-row-bg)">
              <div className="w-28 shrink-0">
                <span className="text-[11px] font-semibold text-(--brand-muted) uppercase tracking-wide">Amount</span>
              </div>
              <div className="w-24 shrink-0">
                <span className="text-[11px] font-semibold text-(--brand-muted) uppercase tracking-wide">Status</span>
              </div>
              <div className="flex-1 min-w-0 hidden sm:block">
                <span className="text-[11px] font-semibold text-(--brand-muted) uppercase tracking-wide whitespace-nowrap">Reference IDs</span>
              </div>
              <div className="w-24 shrink-0 hidden md:block">
                <span className="text-[11px] font-semibold text-(--brand-muted) uppercase tracking-wide">Wallet</span>
              </div>
              <div className="w-24 shrink-0 text-right hidden sm:block">
                <span className="text-[11px] font-semibold text-(--brand-muted) uppercase tracking-wide">Date</span>
              </div>
              <div className="shrink-0 w-[105px]" />
            </div>

            {/* Rows */}
            <div className="divide-y divide-(--brand-border)">
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} onViewPayload={setSelectedTx} />
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-(--brand-border) bg-(--brand-row-bg) flex items-center justify-between gap-2">
              <p className="text-xs text-(--brand-muted)">
                {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
                {source === "live" ? " · Live from Fireblocks" : " · Demo data"}
              </p>
              {lastUpdatedLabel && (
                <p className="text-xs text-(--brand-muted)">
                  Updated {lastUpdatedLabel}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <ApiPayloadDrawer
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </>
  );
}
