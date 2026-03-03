"use client";

import { useState, useMemo, useCallback } from "react";
import { PiggyBank, CheckCircle, ExternalLink } from "lucide-react";
import { WidgetCard, Button, Input, Spinner } from "@dynamic-demos/ui";
import { formatCurrency } from "@dynamic-demos/utils";
import { useWalletAccounts } from "@/hooks/use-wallet-accounts";
import { useActiveNetwork } from "@/hooks/use-active-network";
import { useGasSponsorship } from "@/hooks/use-gas-sponsorship";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { useSendUsdcTransaction } from "@/hooks/use-mutations";
import { getBaseWalletForAddress } from "@/lib/wallet-utils";
import { SAVE_ADDRESS } from "@/lib/deposit-addresses";
import type { NavigationReturn } from "@/hooks/use-navigation";
const PRESET_AMOUNTS = [50, 100, 250, 500];

interface SaveScreenProps {
  walletAddress: string;
  navigation: NavigationReturn;
  onLockModalChange?: (locked: boolean) => void;
  /** Called when save succeeds with the amount saved */
  onSaveSuccess?: (amount: number) => void;
  /** Server-fetched USDC balance for initial render */
  initialUsdcBalance?: number;
}

type SaveStep = "amount" | "confirm" | "sending" | "success";

export function SaveScreen({
  walletAddress,
  navigation,
  onLockModalChange,
  onSaveSuccess,
  initialUsdcBalance,
}: SaveScreenProps) {
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
  const [step, setStep] = useState<SaveStep>("amount");
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
    (newStep: SaveStep, amount?: number) => {
      setStep(newStep);
      const locked = newStep === "sending" || newStep === "success";
      onLockModalChange?.(locked);
      if (newStep === "success" && amount !== undefined)
        onSaveSuccess?.(amount);
    },
    [onLockModalChange, onSaveSuccess],
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
        recipient: SAVE_ADDRESS,
        networkData,
      });
      setTxHash(hash);
      transitionStep("success", effectiveAmount);
    } catch (error) {
      console.error("[Save] Transaction error:", error);
      transitionStep("confirm");
    }
  };

  if (step === "sending") {
    return (
      <WidgetCard>
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-(--widget-muted)">Saving...</p>
        </div>
      </WidgetCard>
    );
  }

  if (step === "success") {
    return (
      <WidgetCard>
        <div className="flex flex-col items-center text-center py-6 px-6 gap-4">
          <div
            className="w-20 h-20 rounded-full bg-(--widget-success)/10 flex items-center justify-center animate-in zoom-in-95 duration-300"
            aria-hidden
          >
            <CheckCircle className="w-10 h-10 text-(--widget-success)" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-(--widget-fg)">Saved</h2>
            <p className="text-sm text-(--widget-muted)">
              {formatCurrency(effectiveAmount, { symbol: true })} saved
            </p>
          </div>
          <div className="flex flex-row gap-4 w-full">
            {txHash && (
              <a
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 h-10 px-3 text-sm font-medium text-(--widget-accent) bg-(--widget-accent)/5 rounded-(--widget-radius) hover:bg-(--widget-accent)/10 transition-colors"
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
        <PiggyBank
          className="w-[18px] h-[18px] text-(--widget-fg)"
          strokeWidth={1.5}
        />
      }
      title="Save"
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
            <p className="text-sm text-(--widget-muted)">
              Available: {formatCurrency(max, { symbol: true })}
            </p>
            {presetOptions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-(--widget-fg) mb-2">
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
                          ? "border-(--widget-primary) bg-(--widget-primary)/10 text-(--widget-primary)"
                          : "border-(--widget-border) hover:bg-(--widget-row-bg) text-(--widget-fg)"
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
                id="save-custom"
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
            <div className="p-4 rounded-lg bg-(--widget-row-bg)">
              <p className="text-sm text-(--widget-muted) mb-1">Amount</p>
              <p className="text-xl font-semibold text-(--widget-fg)">
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
                Save
              </Button>
            </div>
          </div>
        )}
      </form>
    </WidgetCard>
  );
}
