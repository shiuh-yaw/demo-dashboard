"use client";

/**
 * Withdraw to Bank Modal
 *
 * Modal for withdrawing USDC to a bank account via BlindPay PIX.
 * PIX is Brazil's instant payment system with ~5 minute settlement.
 *
 * Unified Flow:
 * 1. If KYC not complete → Setup info → KYC form → Bank form
 * 2. Enter amount
 * 3. Get quote from BlindPay (shows fees, exchange rate)
 * 4. User confirms
 * 5. Execute payout
 * 6. Show success with estimated completion time
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dynamic-demos/ui";
import { Alert } from "@/components/ui/alert";
import { Shield, Building2 } from "lucide-react";
import { useWithdrawToBank, type BlindPayToken } from "@/hooks/use-withdraw-to-bank";
import { useCreatorBalanceOptional } from "@/contexts/creator-balance-context";
import { useBlindPayKYC } from "@/hooks/use-blindpay-kyc";
import { usePayoutDemo } from "@/contexts/payout-demo-context";
import { useSendToDead } from "@/hooks/use-send-to-dead";
import { ModalErrorBoundary } from "@/components/ui/error-boundary";
import {
  BankSetupFlow,
  BankWithdrawalFlow,
  DEMO_KYC_DATA,
  DEMO_BANK_DATA,
  type WithdrawToBankStep,
  type KYCFormData,
  type BankFormData,
} from "./withdraw-to-bank";

// Token used for API calls - USDB is BlindPay's testnet stablecoin
const API_TOKEN: BlindPayToken = "USDB";
// Display name for the token in the UI
const DISPLAY_TOKEN = "PYUSD";

interface WithdrawToBankModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when withdrawal is successfully initiated */
  onSuccess?: (amount: number, payoutId: string) => void;
}

export function WithdrawToBankModal({
  open,
  onOpenChange,
  onSuccess,
}: WithdrawToBankModalProps) {
  const [step, setStep] = useState<WithdrawToBankStep>("amount");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSetupProcessing, setIsSetupProcessing] = useState(false);

  // Setup form state
  const [kycData, setKycData] = useState<KYCFormData>(DEMO_KYC_DATA);
  const [bankData, setBankData] = useState<BankFormData>(DEMO_BANK_DATA);

  const creatorBalance = useCreatorBalanceOptional();
  const payoutDemo = usePayoutDemo();
  const {
    isComplete: isKYCComplete,
    bankAccountId,
    bankDetails,
    isHydrated,
    refresh: refreshKYC,
    completeSetup,
  } = useBlindPayKYC();

  // Use real creator balance, fallback to 0 if not loaded
  const availableAmount = useMemo(() => {
    if (!creatorBalance?.balance) return 0;
    return parseFloat(creatorBalance.balance) || 0;
  }, [creatorBalance?.balance]);

  const {
    getQuote,
    executeWithdrawal,
    reset: resetHook,
    isQuoting,
    isPending: isWithdrawPending,
    quote,
    result,
  } = useWithdrawToBank({
    onSuccess: (res) => {
      // Activity recording moved to handleConfirm where we have access to quote
      setStep("success");
      const amountNum = parseFloat(amount) || 0;
      onSuccess?.(amountNum, res.payoutId);
    },
    onError: (err) => {
      setError(err.message);
      setStep("amount");
    },
  });

  // Hook for sending tokens to burn address (simulates on-chain withdrawal)
  const { sendToDead, isPending: isSendingToDead } = useSendToDead({
    onError: (err) => {
      setError(err.message);
      setStep("confirm");
    },
  });

  // Combined pending state
  const isPending = isWithdrawPending || isSendingToDead;

  // Determine initial step when modal opens
  useEffect(() => {
    if (open) {
      setAmount("");
      setError(null);
      resetHook();
      refreshKYC();
      setKycData(DEMO_KYC_DATA);
      setBankData(DEMO_BANK_DATA);
      setIsSetupProcessing(false);
    }
  }, [open, resetHook, refreshKYC]);

  // Set initial step after hydration
  useEffect(() => {
    if (open && isHydrated) {
      if (!isKYCComplete) {
        setStep("setup_info");
      } else {
        setStep("amount");
      }
    }
  }, [open, isHydrated, isKYCComplete]);

  const handleClose = useCallback(() => {
    if (isPending || isQuoting || isSetupProcessing) return;
    onOpenChange(false);
  }, [onOpenChange, isPending, isQuoting, isSetupProcessing]);

  // Setup completion handler
  const handleSetupComplete = useCallback(() => {
    completeSetup({
      bankName: bankData.bankName,
      pixKey: bankData.pixKey,
      holderName: `${kycData.firstName} ${kycData.lastName}`,
    });
    setStep("amount");
  }, [completeSetup, bankData, kycData.firstName, kycData.lastName]);

  // Withdrawal flow handlers
  const handleGetQuote = useCallback(async () => {
    if (!isKYCComplete || !bankAccountId) {
      setError("Please complete bank account setup first");
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    if (amountNum > availableAmount) {
      setError("Insufficient balance");
      return;
    }

    setError(null);
    try {
      await getQuote({ amountUSD: amountNum, token: API_TOKEN, bankAccountId });
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get quote");
    }
  }, [amount, availableAmount, getQuote, isKYCComplete, bankAccountId]);

  const handleConfirm = useCallback(async () => {
    if (!quote) return;
    setError(null);
    setStep("processing");
    try {
      // Send the full amount including fees to burn address (on-chain transaction)
      // This represents the total cost to the user: amount + fees
      const totalAmount = quote.requestAmount + quote.fees;
      await sendToDead({ amountDollars: totalAmount });

      // Deduct from balance optimistically after successful on-chain transfer
      creatorBalance?.deductBalance(totalAmount);

      // Trigger a balance refresh from blockchain to get accurate balance
      creatorBalance?.triggerRefresh();

      // Record activity with total amount (including fees)
      payoutDemo.recordPIXWithdrawActivity(totalAmount, bankDetails?.pixKey);

      // Then execute the mock payout API call
      await executeWithdrawal(quote.quoteId);
    } catch {
      // Errors handled by hooks
    }
  }, [quote, sendToDead, creatorBalance, payoutDemo, bankDetails?.pixKey, executeWithdrawal]);

  // Get dialog description based on step
  const getDescription = () => {
    switch (step) {
      case "setup_info":
        return "Complete setup to withdraw funds to your bank";
      case "setup_kyc":
        return "Verify your identity (demo auto-fill)";
      case "setup_bank":
        return "Connect your PIX account (demo auto-fill)";
      case "amount":
        return "Transfer funds to your bank account via PIX";
      case "confirm":
        return "Review and confirm your withdrawal";
      case "processing":
        return "Processing your withdrawal...";
      case "success":
        return "Withdrawal initiated successfully!";
      default:
        return "";
    }
  };

  // Get dialog title icon based on step
  const getTitleIcon = () => {
    if (step.startsWith("setup")) {
      return <Shield className="w-5 h-5 text-earn-text-secondary" />;
    }
    return <Building2 className="w-5 h-5 text-earn-text-secondary" />;
  };

  // Get title text
  const getTitleText = () => {
    switch (step) {
      case "setup_info":
        return "Bank Withdrawal Setup";
      case "setup_kyc":
        return "Identity Verification";
      case "setup_bank":
        return "Link Bank Account";
      default:
        return "Withdraw to Bank";
    }
  };

  const isSetupStep = step.startsWith("setup");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <ModalErrorBoundary>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getTitleIcon()}
              {getTitleText()}
            </DialogTitle>
            <DialogDescription>{getDescription()}</DialogDescription>
          </DialogHeader>

          {error && (
            <Alert
              title="Error"
              message={error}
              type="error"
              onDismiss={() => setError(null)}
            />
          )}

          {/* Setup Flow */}
          {isSetupStep && (
            <BankSetupFlow
              step={step}
              onStepChange={setStep}
              kycData={kycData}
              onKYCDataChange={setKycData}
              bankData={bankData}
              onBankDataChange={setBankData}
              onComplete={handleSetupComplete}
              isProcessing={isSetupProcessing}
              setIsProcessing={setIsSetupProcessing}
            />
          )}

          {/* Withdrawal Flow */}
          {!isSetupStep && (
            <BankWithdrawalFlow
              step={step}
              onStepChange={setStep}
              amount={amount}
              onAmountChange={setAmount}
              availableAmount={availableAmount}
              quote={quote}
              result={result}
              bankDetails={bankDetails}
              isKYCComplete={isKYCComplete}
              isHydrated={isHydrated}
              isQuoting={isQuoting}
              isPending={isPending}
              onGetQuote={handleGetQuote}
              onConfirm={handleConfirm}
              onClose={handleClose}
              displayToken={DISPLAY_TOKEN}
            />
          )}
        </ModalErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
