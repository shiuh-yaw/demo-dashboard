"use client";

import { useState, useMemo, useCallback } from "react";
import { ArrowDownToLine, CheckCircle, ExternalLink } from "lucide-react";
import { WidgetCard, Button, Input, Spinner } from "@dynamic-demos/ui";
import { formatCurrency } from "@dynamic-demos/utils";
import { useWalletAccounts } from "@/hooks/use-wallet-accounts";
import { useActiveNetwork } from "@/hooks/use-active-network";
import { useGasSponsorship } from "@/hooks/use-gas-sponsorship";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { useSendUsdcTransaction } from "@/hooks/use-mutations";
import { getBaseWalletForAddress } from "@/lib/wallet-utils";
import { CARD_ADDRESS } from "@/lib/deposit-addresses";
import type { NavigationReturn } from "@/hooks/use-navigation";
const PRESET_AMOUNTS = [50, 100, 250, 500];

interface DepositScreenProps {
  walletAddress: string;
  navigation: NavigationReturn;
  /** Called when modal should be locked (sending/success) or unlocked */
  onLockModalChange?: (locked: boolean) => void;
  /** Called when deposit succeeds with the amount added */
  onDepositSuccess?: (amount: number) => void;
  /** Server-fetched USDC balance for initial render */
  initialUsdcBalance?: number;
}

type DepositStep = "amount" | "confirm" | "sending" | "success";

export function DepositScreen({
  walletAddress,
  navigation,
  onLockModalChange,
  onDepositSuccess,
  initialUsdcBalance,
}: DepositScreenProps) {
  const { walletAccounts } = useWalletAccounts();
  const baseWallet = getBaseWalletForAddress(walletAddress, walletAccounts);
  const { networkData } = useActiveNetwork(baseWallet ?? null);
  const { walletToUse } = useGasSponsorship(
    walletAddress,
    walletAccounts,
    networkData,
  );

  const sendTx = useSendUsdcTransaction();
  const { balance: usdcBalance } = useUsdcBalance(walletAddress || undefined, {
    initialBalance: initialUsdcBalance,
  });

  const max = useMemo(() => Math.max(0, usdcBalance ?? 0), [usdcBalance]);
  const [step, setStep] = useState<DepositStep>("amount");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [txHash, setTxHash] = useState("");

  const effectiveAmount = selectedAmount ?? (parseFloat(customAmount) || 0);
  const isValid = effectiveAmount > 0 && effectiveAmount <= max;
  const presetOptions = useMemo(
    () => PRESET_AMOUNTS.filter((a) => a <= max),
    [max],
  );

  const transitionStep = useCallback(
    (newStep: DepositStep, amount?: number) => {
      setStep(newStep);
      const locked = newStep === "sending" || newStep === "success";
      onLockModalChange?.(locked);
      if (newStep === "success" && amount !== undefined)
        onDepositSuccess?.(amount);
    },
    [onLockModalChange, onDepositSuccess],
  );

  const handleAmountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setStep("confirm");
    onLockModalChange?.(true);
  };

  const handleConfirm = async () => {
    if (!walletToUse || !networkData || !isValid) return;
    transitionStep("sending");

    try {
      const amountStr = Number(effectiveAmount.toFixed(2)).toString();
      const hash = await sendTx.mutateAsync({
        walletAccount: walletToUse,
        amount: amountStr,
        recipient: CARD_ADDRESS,
        networkData,
      });
      setTxHash(hash);
      transitionStep("success", effectiveAmount);
    } catch (error) {
      console.error("[Deposit] Transaction error:", error);
      transitionStep("confirm");
    }
  };

  if (step === "sending") {
    return (
      <WidgetCard>
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-(--brand-muted)">
            Adding funds to your card...
          </p>
        </div>
      </WidgetCard>
    );
  }

  if (step === "success") {
    return (
      <WidgetCard>
        <div className="flex flex-col items-center text-center py-6 px-6 gap-4">
          <div
            className="w-20 h-20 rounded-full bg-(--brand-success)/10 flex items-center justify-center animate-in zoom-in-95 duration-300"
            aria-hidden
          >
            <CheckCircle className="w-10 h-10 text-(--brand-success)" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-(--brand-fg)">
              Funds Added
            </h2>
            <p className="text-sm text-(--brand-muted)">
              {formatCurrency(effectiveAmount, { symbol: true })} added to your
              card
            </p>
          </div>
          <div className="flex flex-row gap-4 w-full">
            {txHash && (
              <a
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 h-10 px-3 text-sm font-medium text-(--brand-accent) bg-(--brand-accent)/5 rounded-(--brand-radius) hover:bg-(--brand-accent)/10 transition-colors"
              >
                View on Explorer
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <Button
              className="flex-1"
              onClick={navigation.goToDashboard}
              size="lg"
            >
              Close
            </Button>
          </div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      icon={
        <ArrowDownToLine
          className="w-[18px] h-[18px] text-(--brand-fg)"
          strokeWidth={1.5}
        />
      }
      title="Deposit to Card"
      subtitle={
        step === "amount"
          ? "Choose amount from your wallet"
          : "Review & confirm"
      }
      onBack={
        step === "confirm"
          ? () => {
              setStep("amount");
              onLockModalChange?.(false);
            }
          : undefined
      }
    >
      <form
        onSubmit={
          step === "amount" ? handleAmountSubmit : (e) => e.preventDefault()
        }
        className="space-y-4"
      >
        {step === "amount" && (
          <>
            <p className="text-sm text-(--brand-muted)">
              Available: {formatCurrency(max, { symbol: true })}
            </p>
            {presetOptions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-(--brand-fg) mb-2">
                  Amount
                </p>
                <div className="flex flex-wrap gap-2">
                  {presetOptions.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(amount);
                        setCustomAmount("");
                      }}
                      disabled={sendTx.isPending}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedAmount === amount && customAmount === ""
                          ? "border-(--brand-primary) bg-(--brand-primary)/10 text-(--brand-primary)"
                          : "border-(--brand-border) hover:bg-(--brand-row-bg) text-(--brand-fg)"
                      }`}
                    >
                      {formatCurrency(amount, { symbol: true })}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Input
                label="Or enter amount"
                id="deposit-custom"
                type="number"
                min={0}
                max={max}
                step={0.01}
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                disabled={sendTx.isPending}
                className="tabular-nums"
              />
            </div>
            <Button
              type="submit"
              disabled={!isValid || sendTx.isPending}
              className="w-full"
            >
              Continue
            </Button>
          </>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-(--brand-row-bg)">
              <p className="text-sm text-(--brand-muted) mb-1">Amount</p>
              <p className="text-xl font-semibold text-(--brand-fg)">
                {formatCurrency(effectiveAmount, { symbol: true })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("amount");
                  onLockModalChange?.(false);
                }}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={sendTx.isPending}
                loading={sendTx.isPending}
                className="flex-1"
              >
                Add to Card
              </Button>
            </div>
          </div>
        )}
      </form>
    </WidgetCard>
  );
}
