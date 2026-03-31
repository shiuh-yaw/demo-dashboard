"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Button,
} from "@dynamic-demos/ui";
import type { MockVaultPosition } from "@/lib/mock-metadata";
import { MOCK_METADATA_KEYS } from "@/lib/mock-metadata";
import { useMockMetadata } from "@/hooks/use-mock-metadata";
import { useMockBalances } from "@/hooks/use-mock-balances";

function formatApy(value: number | null | undefined): string {
  if (value == null) return "--";
  return `${(value * 100).toFixed(2)}%`;
}

interface MyVaultModalProps {
  position: MockVaultPosition;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Action = "deposit" | "withdraw";

export function MyVaultModal({
  position,
  open,
  onOpenChange,
}: MyVaultModalProps) {
  const [action, setAction] = useState<Action>("deposit");
  const [amount, setAmount] = useState("");
  const { metadata, updateMetadata } = useMockMetadata();
  const { getBalance, deductBalance, addBalance } = useMockBalances();

  const earn = (metadata[MOCK_METADATA_KEYS.EARN] ?? {}) as {
    deposits?: MockVaultPosition[];
  };
  const deposits = earn.deposits ?? [];
  const current = deposits.find((d) => d.id === position.id);
  const currentAmount = current ? parseFloat(current.amount) : 0;
  const amountNum = parseFloat(amount) || 0;

  const assetSymbol = position.assetSymbol.toUpperCase();
  const walletBalance = getBalance(assetSymbol);

  const handleSubmit = async () => {
    if (amountNum <= 0) return;

    if (action === "deposit") {
      if (amountNum > walletBalance) return;
      const deducted = await deductBalance(assetSymbol, amountNum);
      if (!deducted) return;
      const updatedDeposits = deposits.map((d) =>
        d.id === position.id
          ? {
              ...d,
              amount: String(currentAmount + amountNum),
            }
          : d,
      );
      await updateMetadata.mutateAsync({
        [MOCK_METADATA_KEYS.EARN]: { deposits: updatedDeposits },
      });
    } else {
      const withdrawAmount = Math.min(amountNum, currentAmount);
      await addBalance(assetSymbol, withdrawAmount);
      if (withdrawAmount >= currentAmount) {
        const updatedDeposits = deposits.filter((d) => d.id !== position.id);
        await updateMetadata.mutateAsync({
          [MOCK_METADATA_KEYS.EARN]: {
            deposits: updatedDeposits,
          },
        });
      } else {
        const updatedDeposits = deposits.map((d) =>
          d.id === position.id
            ? { ...d, amount: String(currentAmount - withdrawAmount) }
            : d,
        );
        await updateMetadata.mutateAsync({
          [MOCK_METADATA_KEYS.EARN]: { deposits: updatedDeposits },
        });
      }
    }
    setAmount("");
    onOpenChange(false);
  };

  const canSubmit =
    amountNum > 0 &&
    (action === "deposit"
      ? amountNum <= walletBalance
      : amountNum <= currentAmount);

  const isPending = updateMetadata.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-trade-surface border-trade-border text-trade-text-primary"
        showCloseButton
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 rounded-full overflow-hidden bg-trade-surface border border-trade-border/50 shrink-0">
              {position.assetLogoURI ? (
                <Image
                  src={position.assetLogoURI}
                  alt={position.assetName}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sm font-medium text-trade-text-muted">
                  {position.assetSymbol.slice(0, 2)}
                </div>
              )}
            </div>
            <div>
              <DialogTitle className="text-lg text-trade-text-primary">
                {position.vaultName}
              </DialogTitle>
              <p className="text-sm text-trade-text-muted">
                {position.assetName} ({position.assetSymbol})
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3 bg-trade-surface-blue border border-trade-border/50">
              <p className="text-xs text-trade-text-muted">APY</p>
              <p className="text-lg font-semibold text-trade-accent tabular-nums">
                {formatApy(position.apy)}
              </p>
            </div>
            <div className="rounded-lg p-3 bg-trade-surface-blue border border-trade-border/50">
              <p className="text-xs text-trade-text-muted">Deposited</p>
              <p className="text-lg font-semibold text-trade-text-primary tabular-nums">
                {currentAmount.toFixed(2)} {position.assetSymbol}
              </p>
            </div>
          </div>
          {action === "deposit" && (
            <p className="text-xs text-trade-text-muted">
              Wallet: {walletBalance.toFixed(2)} {position.assetSymbol}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant={action === "deposit" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setAction("deposit")}
            >
              Deposit
            </Button>
            <Button
              variant={action === "withdraw" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setAction("withdraw")}
            >
              Withdraw
            </Button>
          </div>

          <div>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              label={
                <span className="text-trade-text-primary">
                  Amount ({position.assetSymbol})
                </span>
              }
              className="bg-trade-surface border-trade-border text-trade-text-primary placeholder:text-trade-text-muted"
            />
            {action === "withdraw" && currentAmount > 0 && (
              <button
                type="button"
                onClick={() => setAmount(String(currentAmount))}
                className="mt-1 text-xs text-trade-accent hover:underline"
              >
                Max
              </button>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {action === "deposit" ? "Depositing…" : "Withdrawing…"}
              </>
            ) : action === "deposit" ? (
              "Deposit"
            ) : (
              "Withdraw"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
