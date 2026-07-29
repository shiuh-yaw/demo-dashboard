import { Receipt } from "lucide-react";
import type { FeeTransactionResponse } from "@dynamic-demos/rain";
import { formatCurrency } from "@dynamic-demos/utils";

import { formatTransactionDate } from "./format-date";

interface FeeTransactionProps {
  transaction: FeeTransactionResponse;
}

export function FeeTransaction({ transaction }: FeeTransactionProps) {
  const { fee } = transaction;
  return (
    <div className="flex items-center justify-between px-3 py-2.5 bg-(--brand-row-bg) rounded-(--brand-radius)">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 shrink-0 rounded-lg bg-(--brand-surface) border border-(--brand-border) flex items-center justify-center">
          <Receipt
            className="w-4 h-4 text-(--brand-muted)"
            strokeWidth={1.5}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-(--brand-fg) tracking-[-0.14px] leading-5">
            {fee.description ?? "Fee"}
          </p>
          <p className="text-xs text-(--brand-muted) tracking-[-0.12px] leading-4">
            {formatTransactionDate(fee.postedAt)}
          </p>
        </div>
      </div>
      <span className="text-sm font-medium text-(--brand-error) tabular-nums">
        -{formatCurrency(fee.amount / 100)}
      </span>
    </div>
  );
}
