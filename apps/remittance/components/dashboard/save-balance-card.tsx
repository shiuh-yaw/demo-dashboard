"use client";

import { PiggyBank, ArrowDownToLine } from "lucide-react";
import { Card, CardContent } from "@dynamic-demos/ui";
import { formatCurrency } from "@dynamic-demos/utils";

const SAVE_APY = 4;

interface SaveBalanceCardProps {
  balance: number;
  onClick?: () => void;
}

export function SaveBalanceCard({ balance, onClick }: SaveBalanceCardProps) {
  return (
    <Card
      className={
        onClick
          ? "cursor-pointer hover:border-(--brand-primary)/30 transition-colors"
          : undefined
      }
      onClick={onClick}
    >
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-(--brand-primary)/10 flex items-center justify-center shrink-0">
            <PiggyBank className="w-5 h-5 text-(--brand-primary)" />
          </div>
          <div>
            <p className="text-sm font-medium text-(--brand-fg)">Save</p>
            <p className="text-xs text-(--brand-muted)">{SAVE_APY}% APY</p>
          </div>
        </div>
        <p className="text-xl font-semibold text-(--brand-fg)">
          {formatCurrency(balance, { symbol: true })}
        </p>
        <div onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-(--brand-row-bg) border border-(--brand-border) text-(--brand-muted) cursor-not-allowed text-sm font-medium"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Withdraw
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
