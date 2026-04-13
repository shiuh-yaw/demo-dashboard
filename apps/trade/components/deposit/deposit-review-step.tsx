"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Button } from "@dynamic-demos/ui";
import type { DepositTokenInfo } from "./deposit-token-select-step";

interface DepositReviewStepProps {
  token: DepositTokenInfo;
  amount: string;
  onConfirm: () => void;
  isPending: boolean;
  error: string | null;
}

export function DepositReviewStep({
  token,
  amount,
  onConfirm,
  isPending,
  error,
}: DepositReviewStepProps) {
  const amountNum = parseFloat(amount) || 0;
  const usdValue = amountNum * token.price;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-trade-surface-blue border border-trade-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full overflow-hidden bg-trade-bg flex items-center justify-center">
              <Image
                src={token.image}
                alt={token.name}
                width={32}
                height={32}
                className="object-cover"
              />
            </div>
            <span className="text-sm font-medium text-trade-text-primary">
              {token.name}
            </span>
          </div>
          <span className="text-sm font-semibold text-trade-text-primary tabular-nums">
            {amount} {token.symbol}
          </span>
        </div>

        <div className="border-t border-trade-border/40" />

        <div className="flex items-center justify-between">
          <span className="text-sm text-trade-text-muted">USD Value</span>
          <span className="text-sm font-medium text-trade-text-primary tabular-nums">
            $
            {usdValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-trade-text-muted">Network</span>
          <span className="text-sm font-medium text-trade-text-primary">
            Base
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-trade-text-muted">Fee</span>
          <span className="text-sm font-medium text-trade-success">Free</span>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      <Button onClick={onConfirm} disabled={isPending} className="w-full">
        {isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Processing...
          </>
        ) : (
          "Confirm Deposit"
        )}
      </Button>
    </div>
  );
}
