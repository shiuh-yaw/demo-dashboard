"use client";

import { useCallback } from "react";
import { Input } from "@dynamic-demos/ui";
import { Button } from "@dynamic-demos/ui";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@dynamic-demos/utils";
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
  Clock,
  RefreshCw,
} from "lucide-react";
import type { BankWithdrawalFlowProps } from "./types";

/**
 * Bank Withdrawal Flow Component
 *
 * Handles the withdrawal steps:
 * - Enter Amount (step 4)
 * - Confirm Quote (step 5)
 * - Processing (step 6)
 * - Success (step 7)
 */
export function BankWithdrawalFlow({
  step,
  onStepChange,
  amount,
  onAmountChange,
  availableAmount,
  quote,
  result,
  bankDetails,
  isKYCComplete,
  isHydrated,
  isQuoting,
  isPending,
  onGetQuote,
  onConfirm,
  onClose,
  displayToken,
}: BankWithdrawalFlowProps) {
  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        onAmountChange(value);
      }
    },
    [onAmountChange]
  );

  const handleUseMax = useCallback(() => {
    onAmountChange(availableAmount.toString());
  }, [availableAmount, onAmountChange]);

  const handleBack = useCallback(() => {
    onStepChange("amount");
  }, [onStepChange]);

  const amountNum = parseFloat(amount) || 0;
  const isAmountValid = amountNum > 0 && amountNum <= availableAmount;

  // Withdrawal Step 1: Enter Amount
  if (step === "amount") {
    return (
      <div className="space-y-4">
        {/* Bank Account Info */}
        {isHydrated && isKYCComplete && bankDetails && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-800">
                Bank Account Linked
              </span>
            </div>
            <div className="text-xs text-emerald-700 space-y-1">
              <div className="flex justify-between">
                <span>Bank:</span>
                <span className="font-medium">{bankDetails.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span>PIX Key:</span>
                <span className="font-medium">{bankDetails.pixKey}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="bank-amount">Amount</Label>
          <div className="relative">
            <Input
              id="bank-amount"
              type="number"
              step="0.01"
              min="0"
              max={availableAmount}
              placeholder="0.00"
              value={amount}
              onChange={handleAmountChange}
              disabled={isQuoting}
              className="pr-16"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-earn-text-secondary">
              {displayToken}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-earn-text-secondary">
            <span>
              Available: {formatCurrency(availableAmount)} {displayToken}
            </span>
            <button
              type="button"
              onClick={handleUseMax}
              disabled={isQuoting}
              className="text-earn-active-text hover:underline disabled:opacity-50 cursor-pointer"
            >
              Use max
            </button>
          </div>
        </div>

        {/* PIX Info */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-earn-text-primary">
            <Clock className="w-4 h-4" />
            PIX Transfer
          </div>
          <p className="text-xs text-earn-text-secondary">
            Funds will be converted to BRL and sent via PIX. Estimated arrival:
            ~5 minutes.
          </p>
        </div>

        <Button
          onClick={onGetQuote}
          disabled={!isAmountValid || isQuoting}
          className="w-full"
        >
          {isQuoting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Getting quote...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    );
  }

  // Withdrawal Step 2: Confirm Quote
  if (step === "confirm" && quote) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-earn-text-secondary">You send</span>
            <span className="text-sm font-medium text-earn-text-primary">
              {formatCurrency(quote.requestAmount)} {displayToken}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-earn-text-secondary">Fees</span>
            <span className="text-sm text-earn-text-secondary">
              -{formatCurrency(quote.fees)} {displayToken}
            </span>
          </div>
          <div className="border-t border-earn-border pt-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-earn-text-secondary">
                Recipient receives
              </span>
              <span className="text-base font-semibold text-earn-text-primary">
                R${" "}
                {quote.receiveAmount.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center text-xs text-earn-text-secondary">
            <span>Exchange rate</span>
            <span>
              1 {displayToken} = R$ {quote.exchangeRate.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-earn-text-secondary">
          <Clock className="w-3.5 h-3.5" />
          <span>Estimated arrival: ~5 minutes via PIX</span>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isPending}
            className="flex-1"
          >
            Back
          </Button>
          <Button onClick={onConfirm} disabled={isPending} className="flex-1">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              "Confirm Withdrawal"
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Withdrawal Step 3: Processing
  if (step === "processing") {
    return (
      <div className="py-8 flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-earn-active/10 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-earn-active animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-earn-text-primary">
            Processing withdrawal...
          </p>
          <p className="text-xs text-earn-text-secondary mt-1">
            Please wait while we initiate your PIX transfer
          </p>
        </div>
      </div>
    );
  }

  // Withdrawal Step 4: Success
  if (step === "success" && result) {
    return (
      <div className="pt-6 flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-earn-text-primary">
            Withdrawal Initiated!
          </p>
          <p className="text-xs text-earn-text-secondary mt-1">
            Your PIX transfer is being processed.
            <br />
            Estimated arrival: ~5 minutes
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 w-full">
          <div className="flex justify-between items-center text-sm">
            <span className="text-earn-text-secondary">Total</span>
            <span className="font-medium text-earn-text-primary">
              {formatCurrency((quote?.requestAmount ?? 0) + (quote?.fees ?? 0))} {displayToken}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm mt-2">
            <span className="text-earn-text-secondary">Status</span>
            <span className="text-emerald-600 font-medium capitalize">
              {result.status}
            </span>
          </div>
        </div>
        <Button onClick={onClose} className="w-full">
          Done
        </Button>
      </div>
    );
  }

  return null;
}
