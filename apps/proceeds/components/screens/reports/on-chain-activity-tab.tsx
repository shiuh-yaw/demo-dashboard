"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, Loader2, RotateCcw } from "lucide-react";
import { Spinner } from "@dynamic-demos/ui";
import {
  formatSignedUsd,
  formatDateShort,
  truncateAddress,
} from "@/lib/format";
import { KpiTile } from "@/components/ui/kpi-tile";
import { MonogramChip } from "@/components/ui/monogram-chip";
import { useClientInitialized } from "@/hooks/use-client-initialized";
import {
  useTransactionHistory,
  type AssetTransfer,
} from "@/hooks/use-transaction-history";
import { usePendingPayouts } from "@/hooks/use-pending-payouts";
import { useActiveNetwork } from "@/hooks/use-active-network";
import type { PendingPayoutRecord } from "@/lib/fireblocks-pending";
import {
  getEvmWalletAccount,
  getSmartWalletAccount,
  onEvent,
  offEvent,
} from "@/lib/dynamic";

/**
 * Block-explorer base URLs keyed by EVM chain id — used to build per-tx
 * per-row "view on block explorer" links. Alchemy's `getAssetTransfers`
 * doesn't return explorer URLs itself, so we derive them client-side.
 */
const BLOCK_EXPLORER_TX_BASE: Record<number, string> = {
  1: "https://etherscan.io/tx/",
  11155111: "https://sepolia.etherscan.io/tx/",
  137: "https://polygonscan.com/tx/",
  80002: "https://amoy.polygonscan.com/tx/",
  42161: "https://arbiscan.io/tx/",
  421614: "https://sepolia.arbiscan.io/tx/",
  10: "https://optimistic.etherscan.io/tx/",
  11155420: "https://sepolia-optimism.etherscan.io/tx/",
  8453: "https://basescan.org/tx/",
  84532: "https://sepolia.basescan.org/tx/",
};

function buildExplorerUrl(chainId: number | null, hash: string): string | null {
  if (!chainId) return null;
  const base = BLOCK_EXPLORER_TX_BASE[chainId];
  return base ? `${base}${hash}` : null;
}

type RangeKey = "30d" | "90d" | "12m" | "all";
type TypeKey = "all" | "credit" | "debit";

const RANGE_LABELS: Record<RangeKey, string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
  all: "All time",
};

const TYPE_LABELS: Record<TypeKey, string> = {
  all: "All",
  credit: "Credits",
  debit: "Debits",
};

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setHours(0, 0, 0, 0);
  return d;
}

interface LedgerRow {
  id: string;
  label: string;
  description: string;
  amount: string;
  amountValue: number;
  date: string;
  isoDate: string;
  type: "credit" | "debit";
  explorerUrl: string | null;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MTL_ZERO_ADDRESS = "0xb3d7ECc4e3198173666ecCa6f3F7ca424C39e149";

/**
 * The demo mintable USDC contract on Base Sepolia is named `dUSD` on-chain
 * (Alchemy returns the raw symbol), but for the demo narrative we always
 * surface it to the user as "USDC".
 */
function normalizeSymbol(symbol: string | null | undefined): string {
  if (!symbol) return "Token";
  if (symbol.toLowerCase() === "dusd") return "USDC";
  return symbol;
}

/**
 * A credit from the zero address is a mint. In this demo, monthly App Store
 * proceeds are simulated by minting USDC/dUSD to the developer's smart
 * wallet — so any mint is relabeled as a "Connect" payout in the ledger.
 */
function isConnectPayout(transfer: AssetTransfer, isCredit: boolean): boolean {
  return (
    (isCredit && transfer.from?.toLowerCase() === ZERO_ADDRESS) ||
    transfer.from?.toLowerCase() === MTL_ZERO_ADDRESS.toLowerCase()
  );
}

/**
 * Adapt an Alchemy `AssetTransfer` to the shape the ledger table expects.
 * Credit/debit is derived by comparing `to`/`from` against the logged-in
 * wallet, and the amount is already expressed in human-readable units
 * (Alchemy divides by token decimals for us on `value`).
 */
function toLedgerRow(
  transfer: AssetTransfer,
  wallet: string,
  chainId: number | null,
): LedgerRow | null {
  const lower = wallet.toLowerCase();
  const isCredit = transfer.to?.toLowerCase() === lower;
  const amount = transfer.value ?? 0;
  const signed = isCredit ? amount : -amount;
  const symbol = normalizeSymbol(transfer.asset);
  const isFromConnect = isConnectPayout(transfer, isCredit);

  const counterparty = isCredit ? transfer.from : transfer.to;
  const description = isFromConnect
    ? `App Store proceeds · ${symbol}`
    : isCredit
      ? `${symbol} received from ${truncateAddress(counterparty ?? "")}`
      : `${symbol} sent to ${truncateAddress(counterparty ?? "")}`;

  const amountFormatted = `${isCredit ? "+" : "-"}${Math.abs(
    amount,
  ).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })} ${symbol}`;

  // Alchemy returns ISO 8601 in `metadata.blockTimestamp` when
  // `withMetadata: true` is set on the request.
  const iso = transfer.metadata?.blockTimestamp ?? new Date().toISOString();

  // Source column semantics: who/what originated the money on this row.
  //  - mint credit → "Connect" (simulated App Store payout)
  //  - debit → the developer's own wallet
  //  - real external credit → fall back to the token symbol
  const label = isFromConnect ? "Connect" : isCredit ? symbol : "Wallet";

  return {
    id: `${transfer.hash}:${transfer.from}:${transfer.to}:${transfer.asset ?? ""}`,
    label,
    description,
    amount: amountFormatted,
    amountValue: signed,
    date: formatDateShort(iso),
    isoDate: iso,
    type: isCredit ? "credit" : "debit",
    explorerUrl: buildExplorerUrl(chainId, transfer.hash),
  };
}

export function OnChainActivityTab() {
  const [range, setRange] = useState<RangeKey>("all");
  const [type, setType] = useState<TypeKey>("all");
  const [rangeOpen, setRangeOpen] = useState(false);

  const clientReady = useClientInitialized();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletVersion, setWalletVersion] = useState(0);

  // Active chain comes from the shared `ActiveNetworkProvider`. Switching
  // networks anywhere in the app (header pill, wallet card) updates this
  // value via context, which changes the React-Query key for the
  // transaction-history fetch and triggers a fresh load automatically.
  const { active } = useActiveNetwork();
  const networkId = active ? Number(active.networkId) : null;
  const networkName = active?.displayName ?? null;

  useEffect(() => {
    const listener = () => setWalletVersion((v) => v + 1);
    onEvent({ event: "walletAccountsChanged", listener });
    return () => offEvent({ event: "walletAccountsChanged", listener });
  }, []);

  useEffect(() => {
    if (!clientReady) return;
    const evm = getEvmWalletAccount();
    if (!evm) {
      setWalletAddress(null);
      return;
    }
    const smart = getSmartWalletAccount();
    setWalletAddress(smart?.address ?? evm.address);
  }, [clientReady, walletVersion]);

  const {
    transfers,
    isLoading,
    isFetching,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useTransactionHistory({
    address: walletAddress,
    networkId,
    limit: 25,
  });

  // In-flight Fireblocks payouts — surfaced above the settled ledger so
  // the user can see the gap between "Pay out" submission and on-chain
  // settlement instead of staring at an empty row.
  const {
    orders: allPendingOrders,
    isFetching: pendingFetching,
    refetch: refetchPending,
  } = usePendingPayouts(walletAddress);

  // Pending orders are scoped to the chain currently being viewed. A
  // pending Polygon payout shouldn't surface on the Amoy view — the
  // settled rows below it would never include the matching transfer
  // (Alchemy is queried per-chain), making the row look stuck. When
  // `chainId` on a pending order is `null` (Fireblocks asset id we
  // haven't mapped) we keep it visible — better to show an unmapped
  // pending than silently drop it.
  const pendingOrders = useMemo(() => {
    if (networkId === null) return allPendingOrders;
    return allPendingOrders.filter(
      (o) => o.chainId === null || o.chainId === networkId,
    );
  }, [allPendingOrders, networkId]);

  const rangeStart = useMemo(() => {
    if (range === "30d") return daysAgo(30);
    if (range === "90d") return daysAgo(90);
    if (range === "12m") return monthsAgo(12);
    return null;
  }, [range]);

  const rows = useMemo<LedgerRow[]>(() => {
    if (!walletAddress) return [];
    return transfers
      .map((tx) => toLedgerRow(tx, walletAddress, networkId))
      .filter((r): r is LedgerRow => r !== null);
  }, [transfers, walletAddress, networkId]);

  const filtered = useMemo(() => {
    return rows.filter((tx) => {
      if (type !== "all" && tx.type !== type) return false;
      if (rangeStart && new Date(tx.isoDate) < rangeStart) return false;
      return true;
    });
  }, [rows, type, rangeStart]);

  const netIn = filtered.reduce((acc, tx) => acc + tx.amountValue, 0);
  const creditsCount = filtered.filter((t) => t.type === "credit").length;
  const debitsCount = filtered.filter((t) => t.type === "debit").length;

  const hasWallet = !!walletAddress;
  const errorMessage = useMemo(() => {
    if (!isError) return null;
    if (error instanceof Error) return error.message;
    return "The transaction indexer didn't respond. Try refreshing.";
  }, [isError, error]);

  return (
    <>
      <p className="text-[13px] text-(--widget-muted) mb-5 max-w-[680px] leading-relaxed">
        Every inbound payout and outbound transfer, settled onchain. Unlike
        batched monthly proceeds, stablecoin payouts stream continuously and are
        individually verifiable.
      </p>

      <div
        className="grid gap-4 mb-6"
        style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
      >
        <KpiTile
          label="Net · selected period"
          value={hasWallet ? formatSignedUsd(netIn) : "—"}
          accent={netIn >= 0 ? "positive" : "negative"}
          hint={
            hasWallet
              ? `${creditsCount} credits · ${debitsCount} debits`
              : "Connect a wallet to see activity"
          }
        />
        <KpiTile
          label="Wallet"
          value={hasWallet ? truncateAddress(walletAddress) : "Not connected"}
          accent="neutral"
          hint={
            networkName
              ? `Network · ${networkName}`
              : networkId
                ? `Network · ${networkId}`
                : "Resolving network…"
          }
        />
        <KpiTile
          label="Last reconciled"
          value={isFetching ? "Syncing…" : "Just now"}
          accent="neutral"
          hint="Live balance from onchain state"
          labelAction={
            hasWallet ? (
              <button
                type="button"
                onClick={() => {
                  refetch();
                  refetchPending();
                }}
                disabled={isFetching || pendingFetching}
                aria-label="Refresh activity"
                title="Refresh activity"
                className="p-0.5 -mr-0.5 rounded text-(--widget-muted) hover:text-(--widget-fg) hover:bg-(--widget-row-hover) transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-default"
              >
                <RotateCcw
                  className={`w-3 h-3 ${isFetching || pendingFetching ? "animate-spin" : ""}`}
                />
              </button>
            ) : null
          }
        />
      </div>

      <FilterBar
        range={range}
        type={type}
        rangeOpen={rangeOpen}
        onRangeOpenToggle={() => setRangeOpen((v) => !v)}
        onRangeDismiss={() => setRangeOpen(false)}
        onRangeSelect={(k) => {
          setRange(k);
          setRangeOpen(false);
        }}
        onTypeSelect={setType}
        filteredCount={filtered.length}
        totalCount={rows.length}
      />

      <div className="card" style={{ overflow: "hidden" }}>
        {!clientReady ? (
          <div className="py-16 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : !hasWallet ? (
          <EmptyState
            title="No wallet connected"
            hint="Create a stablecoin wallet to see onchain activity here."
          />
        ) : isError ? (
          <EmptyState
            title="Couldn't load transactions"
            hint={errorMessage ?? "Try refreshing."}
          />
        ) : isLoading && rows.length === 0 && pendingOrders.length === 0 ? (
          <div className="py-16 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : filtered.length === 0 && pendingOrders.length === 0 ? (
          <EmptyState
            title={
              rows.length === 0
                ? "No onchain activity yet"
                : "No transactions in this range"
            }
            hint={
              rows.length === 0
                ? "Your wallet's onchain transfers will appear here once they settle."
                : "Try a wider date range or clear the type filter."
            }
          />
        ) : (
          <LedgerTable rows={filtered} pendingOrders={pendingOrders} />
        )}

        {hasNextPage && filtered.length > 0 && (
          <div className="flex items-center justify-center py-3 border-t border-(--widget-border)">
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="inline-flex items-center gap-2 text-[13px] font-medium text-(--widget-primary) bg-transparent border-none cursor-pointer p-0 disabled:opacity-50"
            >
              {isFetchingNextPage ? (
                <>
                  <Spinner size="sm" /> Loading…
                </>
              ) : (
                "Load more"
              )}
            </button>
          </div>
        )}
      </div>

      <p className="text-[11px] text-(--widget-muted) mt-3 px-1">
        Served by Alchemy&apos;s onchain indexer · Addresses and amounts are
        public on the underlying blockchain.
      </p>
    </>
  );
}

/* ---------- Subcomponents ---------- */

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-[15px] font-medium text-(--widget-fg) mb-1">{title}</p>
      <p className="text-[13px] text-(--widget-muted)">{hint}</p>
    </div>
  );
}

interface FilterBarProps {
  range: RangeKey;
  type: TypeKey;
  rangeOpen: boolean;
  onRangeOpenToggle: () => void;
  onRangeDismiss: () => void;
  onRangeSelect: (k: RangeKey) => void;
  onTypeSelect: (k: TypeKey) => void;
  filteredCount: number;
  totalCount: number;
}

function FilterBar({
  range,
  type,
  rangeOpen,
  onRangeOpenToggle,
  onRangeDismiss,
  onRangeSelect,
  onTypeSelect,
  filteredCount,
  totalCount,
}: FilterBarProps) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="relative">
        {rangeOpen && (
          <div className="fixed inset-0 z-10" onClick={onRangeDismiss} />
        )}
        <button
          type="button"
          onClick={onRangeOpenToggle}
          aria-haspopup="listbox"
          aria-expanded={rangeOpen}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-(--widget-fg) bg-(--widget-bg) border border-(--widget-input-border) rounded-lg px-3 py-1.5 hover:bg-(--widget-row-bg) transition-colors"
        >
          {RANGE_LABELS[range]}
          <ChevronDown className="w-3.5 h-3.5 text-(--widget-muted)" />
        </button>
        {rangeOpen && (
          <div
            role="listbox"
            className="absolute top-full left-0 mt-1.5 z-20 min-w-[180px] bg-(--widget-bg) border border-(--widget-border) rounded-lg overflow-hidden shadow-lg"
          >
            {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
              <button
                key={key}
                role="option"
                aria-selected={range === key}
                onClick={() => onRangeSelect(key)}
                className="w-full flex items-center justify-between text-left px-3.5 py-2 hover:bg-(--widget-row-bg) transition-colors"
                style={{
                  background:
                    range === key ? "var(--widget-row-bg)" : "transparent",
                }}
              >
                <span className="text-[13px] text-(--widget-fg)">
                  {RANGE_LABELS[key]}
                </span>
                {range === key && (
                  <span className="text-[13px] text-(--widget-primary)">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Transaction type"
        className="inline-flex items-center bg-(--widget-row-bg) border border-(--widget-border) rounded-lg p-0.5"
      >
        {(Object.keys(TYPE_LABELS) as TypeKey[]).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={type === key}
            onClick={() => onTypeSelect(key)}
            className="text-[13px] font-medium rounded-md px-3 py-1 transition-colors"
            style={{
              background: type === key ? "var(--widget-bg)" : "transparent",
              color: type === key ? "var(--widget-fg)" : "var(--widget-muted)",
              boxShadow: type === key ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            }}
          >
            {TYPE_LABELS[key]}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <div className="text-[12px] text-(--widget-muted) tabular-nums">
        {filteredCount} of {totalCount} entries
      </div>
    </div>
  );
}

function LedgerTable({
  rows,
  pendingOrders,
}: {
  rows: LedgerRow[];
  pendingOrders: PendingPayoutRecord[];
}) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Source</th>
          <th>Description</th>
          <th style={{ textAlign: "right" }}>Amount</th>
          <th>Date</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {pendingOrders.map((order) => (
          <PendingLedgerRow key={`pending-${order.id}`} order={order} />
        ))}
        {rows.map((tx) => (
          <tr key={tx.id}>
            <td>
              <div className="flex items-center gap-3">
                <MonogramChip text={tx.label} />
                <span className="text-sm font-medium text-(--widget-fg)">
                  {tx.label}
                </span>
              </div>
            </td>
            <td>
              <span className="text-[13px] text-(--widget-muted)">
                {tx.description}
              </span>
            </td>
            <td style={{ textAlign: "right" }}>
              <span
                className="text-sm font-medium tabular-nums"
                style={{
                  color:
                    tx.type === "credit"
                      ? "var(--widget-status-completed-fg)"
                      : "var(--widget-fg)",
                }}
              >
                {tx.amount}
              </span>
            </td>
            <td>
              <span className="text-[13px] text-(--widget-muted) tabular-nums whitespace-nowrap">
                {tx.date}
              </span>
            </td>
            <td style={{ textAlign: "right" }}>
              {tx.explorerUrl ? (
                <a
                  href={tx.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View on block explorer"
                  title="View on block explorer"
                  className="inline-flex items-center text-(--widget-primary) no-underline"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              ) : (
                <span className="text-[13px] text-(--widget-muted) whitespace-nowrap">
                  —
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const PENDING_STATUS_LABEL: Record<string, string> = {
  CREATED: "Submitted",
  SUBMITTED: "Submitted",
  PROCESSING: "Processing",
  AWAITING_PAYMENT: "Awaiting payment",
  PENDING_USER_ACTION: "Pending approval",
};

function relativeFromNow(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return "just now";
  const seconds = Math.floor(elapsed / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * In-flight payout row. Visually anchored to `widget-status-pending-*`
 * tokens so the styling tracks the design system without introducing a
 * one-off accent color. No explorer link (no on-chain hash yet) — a
 * spinner takes that slot to communicate "settling in progress".
 */
function PendingLedgerRow({ order }: { order: PendingPayoutRecord }) {
  const statusLabel = PENDING_STATUS_LABEL[order.status] ?? "Pending";
  const amountDisplay = `+${order.amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })} ${order.asset}`;

  return (
    <tr style={{ background: "var(--widget-status-pending-bg)" }}>
      <td>
        <div className="flex items-center gap-3">
          <MonogramChip text="Connect" />
          <span className="text-sm font-medium text-(--widget-fg)">
            Connect
          </span>
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] text-(--widget-muted)">
            App Store proceeds · {order.asset}
          </span>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{
              background: "var(--widget-bg)",
              color: "var(--widget-status-pending-fg)",
              border: "1px solid var(--widget-status-pending-fg)",
            }}
          >
            {statusLabel}
          </span>
        </div>
      </td>
      <td style={{ textAlign: "right" }}>
        <span
          className="text-sm font-medium tabular-nums"
          style={{ color: "var(--widget-status-pending-fg)" }}
        >
          {amountDisplay}
        </span>
      </td>
      <td>
        <span className="text-[13px] text-(--widget-muted) whitespace-nowrap">
          Submitted {relativeFromNow(order.createdAt)}
        </span>
      </td>
      <td style={{ textAlign: "right" }}>
        <Loader2
          className="w-4 h-4 animate-spin inline-block"
          style={{ color: "var(--widget-status-pending-fg)" }}
          aria-label="Settling on-chain"
        />
      </td>
    </tr>
  );
}
