"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@dynamic-demos/ui";
import type { DepositTokenInfo } from "./deposit-token-select-step";

interface DepositResultStepProps {
  token: DepositTokenInfo;
  amount: string;
  error: string | null;
  onDone: () => void;
  onRetry: () => void;
}

export function DepositResultStep({
  token,
  amount,
  error,
  onDone,
  onRetry,
}: DepositResultStepProps) {
  const amountNum = parseFloat(amount) || 0;
  const usdValue = amountNum * token.price;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <XCircle size={48} className="text-red-500" />
        <p className="text-lg font-semibold text-trade-text-primary">
          Deposit Failed
        </p>
        <p className="text-sm text-trade-text-muted text-center max-w-xs">
          {error}
        </p>
        <Button onClick={onRetry} className="w-full">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <CheckCircle size={48} className="text-trade-success" />
      <p className="text-lg font-semibold text-trade-text-primary">
        Deposit Successful
      </p>
      <p className="text-sm text-trade-text-muted">
        {amount} {token.symbol} deposited
      </p>
      <p className="text-xs text-trade-text-secondary tabular-nums">
        ~$
        {usdValue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
      <Button onClick={onDone} className="w-full mt-2">
        Done
      </Button>
    </div>
  );
}
