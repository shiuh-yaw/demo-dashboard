"use client";

/**
 * Live deposit activity feed — shows USDC deposits flowing through
 * the offramp (received → converting → settled to fiat).
 *
 * Polls the /api/kyc-deposit/deposits endpoint (which proxies to the
 * dashboard's Iron autoramps API) when a customerId is available.
 * Falls back to mock demo data when no customer is connected.
 *
 * The backend provider (Iron) is not mentioned — this shows the
 * abstracted view: "USDC in, fiat out".
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getDynamicClient } from "@/lib/dynamic/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DepositStatus = "received" | "converting" | "settled" | "failed";

interface DepositFeedItem {
  id: string;
  amount: string;
  status: DepositStatus;
  timestamp: string;
  fromAddress: string;
  fiatAmount?: string;
  currency?: string;
  network: string;
  rail?: string;
  // Detail-panel fields
  fee?: string;
  networkFee?: string;
  serviceFee?: string;
  createdAtIso?: string;
  recipientName?: string;
  recipientBank?: string;
  recipientNetwork?: string;
}


// Shared column template so the header and every row line up exactly
// (From flexes; Amount/Status are fixed-width; last track is the row chevron).
const FEED_GRID = "grid-cols-[minmax(0,1fr)_7rem_5rem_1rem]";

// ---------------------------------------------------------------------------
// Iron status → display status mapping
// ---------------------------------------------------------------------------

function mapIronStatus(status: string): DepositStatus {
  const lower = status.toLowerCase();
  // Iron autoramp lifecycle: Created → EditPending → Authorized →
  // DepositAccountAdded → Approved (terminal success in sandbox).
  if (lower === "completed" || lower === "settled" || lower === "approved") {
    return "settled";
  }
  if (
    lower === "authorized" ||
    lower === "depositaccountadded" ||
    lower === "processing" ||
    lower === "converting" ||
    lower === "pending_approval"
  ) {
    return "converting";
  }
  if (lower === "failed" || lower === "cancelled" || lower === "rejected") {
    return "failed";
  }
  return "received";
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  BRL: "R$",
  MXN: "$",
};

function currencySymbol(code?: string): string {
  return CURRENCY_SYMBOLS[code || "USD"] || "";
}

function formatTimestamp(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 10_000) return "Just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DepositFeed() {
  const [feed, setFeed] = useState<DepositFeedItem[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [selected, setSelected] = useState<DepositFeedItem | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDeposits = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      const client = getDynamicClient();
      if (client) {
        const token = (client as unknown as { token?: string | null }).token;
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(
        `/api/kyc-deposit/deposits`,
        { headers },
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        deposits: Array<{
          id: string;
          status: string;
          created_at: string;
          kind: string;
          // Recovered server-side from the autoramp's external_id.
          amountUsdc?: string | null;
          fiatAmount?: string | null;
          fiatCurrency?: string | null;
          feeUsdc?: string | null;
          networkFeeUsdc?: string | null;
          serviceFeeUsdc?: string | null;
          fromAddress?: string | null;
          source_currencies?: Array<{ blockchain?: string }>;
          deposit_rails?: Array<{ address?: string }>;
          recipient?: {
            provider_name?: string;
            account_identifier?: { type?: string };
            recipient?: { given_name?: string; family_name?: string };
          };
        }>;
      };
      const fmt = (v: string) =>
        parseFloat(v).toLocaleString("en-US", { minimumFractionDigits: 2 });
      const mapped: DepositFeedItem[] = data.deposits.map((d) => {
        const r = d.recipient;
        const holder = [r?.recipient?.given_name, r?.recipient?.family_name]
          .filter(Boolean)
          .join(" ");
        return {
          id: d.id,
          amount: d.amountUsdc ? fmt(d.amountUsdc) : "—",
          status: mapIronStatus(d.status),
          timestamp: formatTimestamp(d.created_at),
          // Prefer the real depositor; fall back to the (placeholder) rail.
          fromAddress: truncateAddress(
            d.fromAddress || d.deposit_rails?.[0]?.address || "",
          ),
          fiatAmount: d.fiatAmount ? fmt(d.fiatAmount) : undefined,
          currency: d.fiatCurrency || "USD",
          network: d.source_currencies?.[0]?.blockchain
            ? `${d.source_currencies[0].blockchain} Sepolia`
            : "Base Sepolia",
          rail: d.kind === "Offramp" ? "Offramp" : "Deposit",
          fee: d.feeUsdc ?? undefined,
          networkFee: d.networkFeeUsdc ?? undefined,
          serviceFee: d.serviceFeeUsdc ?? undefined,
          createdAtIso: d.created_at,
          recipientName: holder || undefined,
          recipientBank: r?.provider_name || undefined,
          recipientNetwork: r?.account_identifier?.type || undefined,
        };
      });
      // Reflect live data exactly — empty until the first real deposit lands.
      setFeed(mapped);
    } catch {
      // Silently ignore — keep showing last known data
    }
  }, []);

  useEffect(() => {
    setIsPolling(true);
    fetchDeposits();
    intervalRef.current = setInterval(fetchDeposits, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchDeposits]);

  const totalDeposited = feed.reduce(
    (sum, item) => sum + parseFloat(item.amount.replace(/[^0-9.]/g, "") || "0"),
    0,
  );
  const totalSettled = feed
    .filter((f) => f.status === "settled")
    .reduce(
      (sum, item) =>
        sum + parseFloat((item.fiatAmount || "0").replace(/[^0-9.]/g, "")),
      0,
    );
  const feedCurrency = feed.find((f) => f.currency)?.currency || "USD";
  const fiatSymbol = currencySymbol(feedCurrency);

  return (
    <div className="flex flex-col h-full rounded-2xl border border-(--brand-border) bg-(--brand-surface) p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      {/* Header — swaps to the detail title (with a leading back arrow) when a
          row is open. */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          {selected && (
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Back to deposit activity"
              className="-ml-1 flex h-7 w-7 items-center justify-center rounded-full text-(--brand-fg) transition-colors hover:bg-(--brand-border)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M10 4l-4 4 4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <h2 className="text-sm font-semibold text-(--brand-fg)">
            {selected ? "Deposit details" : "Deposit Activity"}
          </h2>
        </div>
        {!selected && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-(--brand-muted) bg-(--brand-surface) border border-(--brand-border) rounded-full px-2 py-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${isPolling ? "bg-green-500 animate-pulse" : "bg-(--brand-muted)"}`}
            />
            {isPolling ? "Live" : "Idle"}
          </span>
        )}
      </div>

      {/* Summary stats — hidden while a deposit detail is open. */}
      {!selected && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <StatCard label="Deposits" value={String(feed.length)} />
          <StatCard
            label="Deposited"
            value={`${totalDeposited.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`}
          />
          <StatCard
            label="Settled"
            value={`${fiatSymbol}${totalSettled.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />
        </div>
      )}

      {/* Feed — replaced in place by the detail view when a row is selected. */}
      <div className="rounded-xl border border-(--brand-border) bg-(--brand-surface) overflow-hidden flex-1">
        {selected ? (
          <DepositDetail item={selected} />
        ) : (
          <>
            <div className={`grid ${FEED_GRID} gap-3 px-3 py-2 border-b border-(--brand-border) bg-(--brand-row-bg)`}>
              <span className="text-[10px] uppercase tracking-wide text-(--brand-muted) font-medium">
                From
              </span>
              <span className="text-[10px] uppercase tracking-wide text-(--brand-muted) font-medium text-right">
                Amount
              </span>
              <span className="text-[10px] uppercase tracking-wide text-(--brand-muted) font-medium text-right">
                Status
              </span>
              <span aria-hidden />
            </div>

            <div className="divide-y divide-(--brand-border) max-h-[480px] overflow-y-auto">
              {feed.length === 0 && (
                <div className="flex items-center justify-center py-10">
                  <p className="text-xs text-(--brand-muted) animate-pulse">
                    Waiting for deposits…
                  </p>
                </div>
              )}
              {feed.map((item) => (
                <FeedRow key={item.id} item={item} onSelect={setSelected} />
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-(--brand-border) bg-(--brand-row-bg) px-3 py-2">
      <span className="block text-[9px] uppercase tracking-wide text-(--brand-muted) font-medium mb-0.5">
        {label}
      </span>
      <span className="block text-sm font-semibold text-(--brand-fg) tabular-nums">
        {value}
      </span>
    </div>
  );
}

function FeedRow({
  item,
  onSelect,
}: {
  item: DepositFeedItem;
  onSelect: (item: DepositFeedItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`grid w-full ${FEED_GRID} gap-3 items-center px-3 py-2.5 text-left transition-colors hover:bg-(--brand-row-bg) focus-visible:outline-none focus-visible:bg-(--brand-row-bg)`}
    >
      {/* From */}
      <div className="flex items-center gap-2 min-w-0">
        <StatusIcon status={item.status} />
        <div className="flex flex-col gap-0 min-w-0">
          <span className="text-[11px] font-mono text-(--brand-fg) truncate">
            {item.fromAddress}
          </span>
          <span className="text-[9px] text-(--brand-muted)">
            {item.network} · {item.timestamp}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="flex flex-col items-end gap-0">
        <span className="text-[11px] font-medium text-(--brand-fg) tabular-nums whitespace-nowrap">
          {item.amount} USDC
        </span>
        {item.status === "settled" && item.fiatAmount && (
          <span className="text-[9px] text-green-700 font-medium tabular-nums">
            → {currencySymbol(item.currency)}
            {item.fiatAmount}
          </span>
        )}
        {item.status === "converting" && (
          <span className="text-[9px] text-amber-600">converting…</span>
        )}
      </div>

      {/* Status */}
      <div className="flex justify-end">
        <StatusBadge status={item.status} />
      </div>

      {/* Chevron */}
      <svg
        className="h-3.5 w-3.5 justify-self-end text-(--brand-muted)"
        fill="none"
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path
          d="M6 4l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function StatusIcon({ status }: { status: DepositStatus }) {
  if (status === "settled") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100">
        <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 20 20">
          <path
            d="M6.5 10.5l2 2 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }
  if (status === "converting") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100">
        <div className="h-2.5 w-2.5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (status === "received") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100">
        <svg className="h-3 w-3 text-blue-600" fill="none" viewBox="0 0 20 20">
          <path
            d="M10 3v10m0 0l-3-3m3 3l3-3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100">
      <svg className="h-3 w-3 text-red-500" fill="none" viewBox="0 0 20 20">
        <path
          d="M7 7l6 6m0-6l-6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function StatusBadge({ status }: { status: DepositStatus }) {
  const config: Record<DepositStatus, { label: string; classes: string }> = {
    received: {
      label: "Received",
      classes: "bg-blue-50 text-blue-700 border-blue-200",
    },
    converting: {
      label: "Converting",
      classes: "bg-amber-50 text-amber-700 border-amber-200",
    },
    settled: {
      label: "Settled",
      classes: "bg-green-50 text-green-700 border-green-200",
    },
    failed: {
      label: "Failed",
      classes: "bg-red-50 text-red-700 border-red-200",
    },
  };

  const { label, classes } = config[status];

  return (
    <span
      className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-medium border min-w-[52px] ${classes}`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Inline detail (replaces the list inside the panel — no flyout)
// ---------------------------------------------------------------------------

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2.5">
      <span className="text-xs text-(--brand-muted)">{label}</span>
      <span className="text-xs font-medium text-(--brand-fg) text-right tabular-nums break-all">
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="pb-1 pt-2 text-[10px] uppercase tracking-wide text-(--brand-muted) font-medium">
      {children}
    </p>
  );
}

function DepositDetail({ item }: { item: DepositFeedItem }) {
  const date = item.createdAtIso
    ? new Date(item.createdAtIso).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : item.timestamp;
  const hasFeeBreakdown = item.networkFee || item.serviceFee;

  return (
    <div className="flex flex-col">

      <div className="max-h-[480px] overflow-y-auto p-3 pt-3">
        {/* Transaction */}
        <SectionLabel>Transaction</SectionLabel>
        <div className="mb-3 divide-y divide-(--brand-border) rounded-xl border border-(--brand-border)">
          <div className="flex items-center justify-between gap-4 px-3 py-2.5">
            <span className="text-xs text-(--brand-muted)">Status</span>
            <StatusBadge status={item.status} />
          </div>
          <DetailRow label="Source Amount" value={`${item.amount} USDC`} />
          {item.fiatAmount && (
            <DetailRow
              label="Destination Amount"
              value={`${item.fiatAmount} ${item.currency ?? "USD"}`}
            />
          )}
          {item.fee && <DetailRow label="Fee" value={`${item.fee} USDC`} />}
          <DetailRow label="Network" value={item.network} />
          <DetailRow label="From" value={item.fromAddress} />
          <DetailRow label="Created At" value={date} />
        </div>

        {/* Deducted fees */}
        {hasFeeBreakdown && (
          <>
            <SectionLabel>Deducted fees</SectionLabel>
            <div className="mb-3 divide-y divide-(--brand-border) rounded-xl border border-(--brand-border)">
              {item.networkFee && (
                <DetailRow
                  label="Network fee"
                  value={`${item.networkFee} USDC`}
                />
              )}
              {item.serviceFee && (
                <DetailRow
                  label="Service fee"
                  value={`${item.serviceFee} USDC`}
                />
              )}
              {item.fee && (
                <DetailRow label="Total" value={`${item.fee} USDC`} />
              )}
            </div>
          </>
        )}

        {/* Recipient */}
        {(item.recipientName || item.recipientBank) && (
          <>
            <SectionLabel>Settles to</SectionLabel>
            <div className="mb-2 divide-y divide-(--brand-border) rounded-xl border border-(--brand-border)">
              {item.recipientName && (
                <DetailRow label="Recipient" value={item.recipientName} />
              )}
              {item.recipientBank && (
                <DetailRow label="Bank" value={item.recipientBank} />
              )}
              {item.recipientNetwork && (
                <DetailRow label="Rail" value={item.recipientNetwork} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
