"use client";

import { useState } from "react";
import Image from "next/image";
import { Input, Button } from "@dynamic-demos/ui";
import type { DepositTokenInfo } from "./deposit-token-select-step";

interface DepositAmountStepProps {
  token: DepositTokenInfo;
  onContinue: (amount: string) => void;
}

export function DepositAmountStep({
  token,
  onContinue,
}: DepositAmountStepProps) {
  const [amount, setAmount] = useState("");

  const amountNum = parseFloat(amount) || 0;
  const usdValue = amountNum * token.price;
  const canContinue = amountNum > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl bg-trade-surface-blue border border-trade-border/50 p-3">
        <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden bg-trade-bg flex items-center justify-center">
          <Image
            src={token.image}
            alt={token.name}
            width={32}
            height={32}
            className="object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-trade-text-primary">
            {token.name}
          </p>
          <p className="text-xs text-trade-text-secondary">{token.symbol}</p>
        </div>
      </div>

      <Input
        label={
          <span className="flex items-center justify-between w-full">
            <span className="text-trade-text-primary">
              Amount ({token.symbol})
            </span>
            {amountNum > 0 && (
              <span className="text-xs text-trade-text-secondary tabular-nums">
                ~$
                {usdValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            )}
          </span>
        }
        type="number"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
        min="0"
        step="any"
        className="bg-trade-surface border-trade-border text-trade-text-primary placeholder:text-trade-text-muted"
      />

      <Button onClick={() => onContinue(amount)} disabled={!canContinue} className="w-full">
        Continue
      </Button>
    </div>
  );
}
