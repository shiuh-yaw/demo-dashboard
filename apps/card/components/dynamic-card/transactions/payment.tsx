import { CreditCard, ExternalLink } from "lucide-react";
import type { PaymentTransactionResponse } from "@dynamic-demos/rain";
import { formatCurrency } from "@dynamic-demos/utils";

import { formatTransactionDate } from "./format-date";
import { explorerTxUrl } from "@/lib/explorer";

interface PaymentTransactionProps {
  transaction: PaymentTransactionResponse;
}

export function PaymentTransaction({ transaction }: PaymentTransactionProps) {
  const { payment } = transaction;
  const txUrl = explorerTxUrl(payment.chainId, payment.transactionHash);

  const rowClass =
    "group flex items-center justify-between px-3 py-2.5 bg-(--brand-row-bg) rounded-(--brand-radius)";
  const inner = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 shrink-0 rounded-lg bg-(--brand-surface) border border-(--brand-border) flex items-center justify-center">
          <CreditCard
            className="w-4 h-4 text-(--brand-error)"
            strokeWidth={1.5}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-(--brand-fg) tracking-[-0.14px] leading-5">
            {payment.memo ?? "Payment"}
          </p>
          <p className="text-xs text-(--brand-muted) tracking-[-0.12px] leading-4">
            {formatTransactionDate(payment.postedAt)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-medium text-(--brand-error) tabular-nums">
          -{formatCurrency(payment.amount / 100)}
        </span>
        {/* Fixed slot so amounts align whether or not a row links out. */}
        <span className="flex w-4 shrink-0 items-center justify-center">
          {txUrl && (
            <ExternalLink className="w-3.5 h-3.5 text-(--brand-muted) opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </span>
      </div>
    </>
  );

  return txUrl ? (
    <a
      href={txUrl}
      target="_blank"
      rel="noreferrer"
      className={`${rowClass} transition-colors hover:bg-(--brand-row-hover)`}
    >
      {inner}
    </a>
  ) : (
    <div className={rowClass}>{inner}</div>
  );
}
