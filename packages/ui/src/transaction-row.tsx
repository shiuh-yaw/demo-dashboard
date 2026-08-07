"use client";

/**
 * One transaction in a history list: direction, amount, counterparty, age.
 *
 * Takes derived props rather than an SDK transaction object - the two apps
 * using this pin different `@dynamic-labs-sdk/client` versions, so the shared
 * component cannot name that type. Each app maps its own response shape onto
 * these fields, which also keeps the "is this sent or received" decision
 * (a `labels` array in the current API) at the edge where it can change.
 *
 * The whole row is the explorer link when there is one, so the hit target is
 * the row rather than a small trailing icon.
 */

import {
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  History,
} from "lucide-react";
import { cn, truncateAddress } from "@dynamic-demos/utils";

export type TransactionDirection = "sent" | "received" | "unknown";

export interface TransactionRowProps {
  direction: TransactionDirection;
  /** Decimal amount, already scaled. Omit when the API reports none. */
  amount?: number;
  /** Ticker shown after the amount, e.g. `USDC`. */
  symbol?: string;
  /** The other side of the transfer - rendered as `To …` / `From …`. */
  counterparty?: string;
  /** Falls back to the hash when there is no counterparty to show. */
  hash?: string;
  timestamp: Date;
  explorerUrl?: string;
  className?: string;
}

const DIRECTION_LABEL: Record<TransactionDirection, string> = {
  sent: "Sent",
  received: "Received",
  unknown: "Transaction",
};

export function TransactionRow({
  direction,
  amount,
  symbol,
  counterparty,
  hash,
  timestamp,
  explorerUrl,
  className,
}: TransactionRowProps) {
  const Icon =
    direction === "sent"
      ? ArrowUpRight
      : direction === "received"
        ? ArrowDownLeft
        : History;

  const amountTone =
    direction === "sent"
      ? "text-(--brand-error)"
      : direction === "received"
        ? "text-(--brand-success)"
        : "text-(--brand-fg)";

  const subtitle = counterparty
    ? `${direction === "sent" ? "To" : "From"} ${truncateAddress(counterparty)}`
    : hash
      ? truncateAddress(hash)
      : "";

  const body = (
    <>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-(--brand-border) bg-(--brand-surface)">
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            direction === "sent"
              ? "text-(--brand-error)"
              : direction === "received"
                ? "text-(--brand-success)"
                : "text-(--brand-muted)",
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-[-0.12px] text-(--brand-fg)">
            {DIRECTION_LABEL[direction]}
          </p>
          {amount != null && (
            <p
              className={cn(
                "text-xs font-medium tabular-nums tracking-[-0.12px]",
                amountTone,
              )}
            >
              {direction === "sent" ? "-" : direction === "received" ? "+" : ""}
              {amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
              {symbol ? ` ${symbol}` : ""}
            </p>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-xs tracking-[-0.12px] text-(--brand-muted)">
            {subtitle}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-[11px] tabular-nums text-(--brand-muted)">
              {formatRelativeTime(timestamp)}
            </span>
            {explorerUrl && (
              <ExternalLink className="h-3 w-3 text-(--brand-muted)" />
            )}
          </div>
        </div>
      </div>
    </>
  );

  const shared = cn(
    "flex items-center gap-2.5 rounded-(--brand-radius) bg-(--brand-row-bg) px-2.5 py-2 transition-all duration-150 ease-out",
    className,
  );

  if (!explorerUrl) {
    return <div className={shared}>{body}</div>;
  }

  return (
    <a
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        shared,
        // No lift: this row lives in a scrolling list, which clips it.
        "cursor-pointer hover:bg-(--brand-row-hover) hover:shadow-sm active:scale-[0.99] active:shadow-none",
      )}
    >
      {body}
    </a>
  );
}

/** `just now` / `5m ago` / `3h ago` / `12d ago`, then an absolute date. */
export function formatRelativeTime(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
