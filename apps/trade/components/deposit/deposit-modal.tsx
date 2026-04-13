"use client";

import { useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@dynamic-demos/ui";
import { useMockBalances } from "@/hooks/use-mock-balances";
import {
  DepositTokenSelectStep,
  type DepositTokenInfo,
} from "./deposit-token-select-step";
import { DepositAmountStep } from "./deposit-amount-step";
import { DepositReviewStep } from "./deposit-review-step";
import { DepositResultStep } from "./deposit-result-step";

type DepositStep = "token" | "amount" | "review" | "result";

const STEP_TITLES: Record<DepositStep, string> = {
  token: "Select Token",
  amount: "Deposit Amount",
  review: "Review Deposit",
  result: "Deposit",
};

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DepositModal({ open, onOpenChange }: DepositModalProps) {
  const [step, setStep] = useState<DepositStep>("token");
  const [selectedToken, setSelectedToken] = useState<DepositTokenInfo | null>(
    null,
  );
  const [amount, setAmount] = useState("");
  const [depositError, setDepositError] = useState<string | null>(null);
  const [mockPending, setMockPending] = useState(false);

  const { addBalance } = useMockBalances();

  const reset = useCallback(() => {
    setStep("token");
    setSelectedToken(null);
    setAmount("");
    setDepositError(null);
    setMockPending(false);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) reset();
      onOpenChange(open);
    },
    [onOpenChange, reset],
  );

  const handleTokenSelect = (token: DepositTokenInfo) => {
    setSelectedToken(token);
    setStep("amount");
  };

  const handleAmountContinue = (amt: string) => {
    setAmount(amt);
    setStep("review");
  };

  const handleConfirm = async () => {
    if (!selectedToken) return;
    setDepositError(null);
    setMockPending(true);

    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await addBalance(selectedToken.symbol, parseFloat(amount));
      setMockPending(false);
      setStep("result");
    } catch {
      setMockPending(false);
      setDepositError("Deposit failed. Please try again.");
    }
  };

  const handleBack = () => {
    if (step === "amount") setStep("token");
    else if (step === "review") setStep("amount");
  };

  const isLocked = step === "review" && mockPending;

  return (
    <Dialog open={open} onOpenChange={isLocked ? undefined : handleOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-trade-surface border-trade-border text-trade-text-primary"
        showCloseButton={!isLocked}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            {(step === "amount" || step === "review") && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isLocked}
                className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all hover:bg-trade-bg disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4 text-trade-text-muted" />
              </button>
            )}
            <DialogTitle className="text-lg text-trade-text-primary">
              {STEP_TITLES[step]}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="mt-4">
          {step === "token" && (
            <DepositTokenSelectStep onSelect={handleTokenSelect} />
          )}
          {step === "amount" && selectedToken && (
            <DepositAmountStep
              token={selectedToken}
              onContinue={handleAmountContinue}
            />
          )}
          {step === "review" && selectedToken && (
            <DepositReviewStep
              token={selectedToken}
              amount={amount}
              onConfirm={handleConfirm}
              isPending={mockPending}
              error={depositError}
            />
          )}
          {step === "result" && selectedToken && (
            <DepositResultStep
              token={selectedToken}
              amount={amount}
              error={depositError}
              onDone={() => handleOpenChange(false)}
              onRetry={() => {
                setDepositError(null);
                setStep("review");
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
