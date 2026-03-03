"use client";

import { useState, useEffect } from "react";
import { ArrowDownToLine, CheckCircle, ExternalLink } from "lucide-react";
import { WidgetCard, Button, Input, Spinner } from "@dynamic-demos/ui";
import { ErrorMessage } from "@/components/error-message";
import { useWalletAccounts } from "@/hooks/use-wallet-accounts";
import { useBankStatus } from "@/hooks/use-bank-status";
import { getAuthToken } from "@/lib/dynamic";
import { useActiveNetwork } from "@/hooks/use-active-network";
import { useGasSponsorship } from "@/hooks/use-gas-sponsorship";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { useSendUsdcTransaction } from "@/hooks/use-mutations";
import { formatCurrency } from "@dynamic-demos/utils";
import { getBaseWalletForAddress } from "@/lib/wallet-utils";
import type { NavigationReturn } from "@/hooks/use-navigation";

interface WithdrawScreenProps {
  walletAddress: string;
  navigation: NavigationReturn;
  /** Called when modal should be locked (sending/success) or unlocked */
  onLockModalChange?: (locked: boolean) => void;
  /** Called when withdrawal succeeds, e.g. to refresh balance */
  onWithdrawalSuccess?: () => void;
  /** Server-resolved bank status. Skips client fetch when provided. */
  initialHasSubmittedBankDetails?: boolean;
  /** Withdraw vault address from server metadata. Skips /api/withdraw/address when provided. */
  initialWithdrawVaultAddress?: string | null;
  /** Server-fetched USDC balance for initial render. */
  initialUsdcBalance?: number;
}

type WithdrawStep = "bank" | "amount" | "confirm" | "sending" | "success";

export function WithdrawScreen({
  walletAddress,
  navigation,
  onLockModalChange,
  onWithdrawalSuccess,
  initialHasSubmittedBankDetails,
  initialWithdrawVaultAddress,
  initialUsdcBalance,
}: WithdrawScreenProps) {
  const { walletAccounts } = useWalletAccounts();
  const baseWallet = getBaseWalletForAddress(walletAddress, walletAccounts);
  const { networkData } = useActiveNetwork(baseWallet ?? null);
  const { walletToUse, isSponsored } = useGasSponsorship(
    walletAddress,
    walletAccounts,
    networkData,
  );

  const sendTx = useSendUsdcTransaction();
  const { balance: usdcBalance } = useUsdcBalance(walletAddress || undefined, {
    initialBalance: initialUsdcBalance,
  });
  const {
    hasSubmittedBankDetails: clientBankStatus,
    isLoading: isBankStatusLoading,
    refetch: refetchBankStatus,
  } = useBankStatus(true);

  const hasSubmittedBankDetails =
    initialHasSubmittedBankDetails ?? clientBankStatus ?? false;
  const isBankStatusReady =
    initialHasSubmittedBankDetails !== undefined || !isBankStatusLoading;

  const [step, setStep] = useState<WithdrawStep>("amount");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [vaultAddress, setVaultAddress] = useState<string | null>(null);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [isFetchingVault, setIsFetchingVault] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [bankError, setBankError] = useState<string | null>(null);
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);

  const isLocked = step === "sending" || step === "success";

  useEffect(() => {
    onLockModalChange?.(isLocked);
  }, [isLocked, onLockModalChange]);

  useEffect(() => {
    if (step === "success") onWithdrawalSuccess?.();
  }, [step, onWithdrawalSuccess]);

  useEffect(() => {
    if (
      isBankStatusReady &&
      hasSubmittedBankDetails === false &&
      step === "amount"
    ) {
      setStep("bank");
    }
  }, [isBankStatusReady, hasSubmittedBankDetails, step]);

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankError(null);
    const routing = routingNumber.replace(/\D/g, "");
    const account = accountNumber.trim();
    if (account.length === 0) {
      setBankError("Account number is required");
      return;
    }
    if (routing.length !== 9) {
      setBankError("Routing number must be 9 digits");
      return;
    }
    setIsSubmittingBank(true);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/withdraw/bank-submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          accountNumber: account,
          routingNumber: routing,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refetchBankStatus();
        setStep("amount");
      } else {
        setBankError(data.error ?? "Failed to submit bank details");
      }
    } catch {
      setBankError("Could not reach withdrawal service");
    } finally {
      setIsSubmittingBank(false);
    }
  };

  const handleAmountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setVaultError(null);

    if (initialWithdrawVaultAddress) {
      setVaultAddress(initialWithdrawVaultAddress);
      setStep("confirm");
      return;
    }

    setIsFetchingVault(true);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/withdraw/address", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.address) {
        setVaultAddress(data.address);
        setStep("confirm");
      } else {
        setVaultError(data.error ?? "Could not get vault address");
      }
    } catch {
      setVaultError("Could not reach withdrawal service");
    } finally {
      setIsFetchingVault(false);
    }
  };

  const handleConfirm = async () => {
    if (!walletToUse || !networkData || !vaultAddress) return;
    setStep("sending");

    try {
      const hash = await sendTx.mutateAsync({
        walletAccount: walletToUse,
        amount,
        recipient: vaultAddress,
        networkData,
      });
      setTxHash(hash);
      setStep("success");
    } catch (error) {
      console.error("[Withdraw] Transaction error:", error);
      setStep("confirm");
    }
  };

  if (step === "sending") {
    return (
      <WidgetCard>
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-(--widget-muted)">
            Processing withdrawal...
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
            className="w-20 h-20 rounded-full bg-(--widget-success)/10 flex items-center justify-center animate-in zoom-in-95 duration-300"
            aria-hidden
          >
            <CheckCircle className="w-10 h-10 text-(--widget-success)" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-(--widget-fg)">
              Withdrawal Initiated
            </h2>
            <p className="text-sm text-(--widget-muted)">
              {formatCurrency(amount)} withdrawal to your bank account has been
              initiated. Processing typically takes 1-3 business days.
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
        <ArrowDownToLine
          className="w-[18px] h-[18px] text-(--widget-fg)"
          strokeWidth={1.5}
        />
      }
      title="Withdraw to Bank"
      subtitle={
        step === "bank"
          ? "Enter your bank account details"
          : step === "amount"
            ? "Enter withdrawal amount"
            : "Review & confirm"
      }
      onBack={step === "confirm" ? () => setStep("amount") : undefined}
    >
      {(step === "bank" || step === "amount") && !isBankStatusReady && (
        <div className="flex flex-col items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}
      {step === "bank" && isBankStatusReady && (
        <form onSubmit={handleBankSubmit} className="space-y-4">
          <Input
            label="Routing number"
            type="text"
            inputMode="numeric"
            value={routingNumber}
            onChange={(e) =>
              setRoutingNumber(e.target.value.replace(/\D/g, "").slice(0, 9))
            }
            placeholder="9 digits"
            autoFocus
          />
          <Input
            label="Account number"
            type="text"
            inputMode="numeric"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="Your account number"
          />
          <ErrorMessage error={bankError} />
          <Button
            type="submit"
            className="w-full"
            disabled={
              routingNumber.replace(/\D/g, "").length !== 9 ||
              accountNumber.trim().length === 0
            }
            loading={isSubmittingBank}
          >
            Continue
          </Button>
        </form>
      )}
      {step === "amount" && isBankStatusReady && (
        <form onSubmit={handleAmountSubmit} className="space-y-4">
          <div>
            <Input
              label="Amount (USDC)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
            <p className="text-xs text-(--widget-muted) mt-1">
              Available: {formatCurrency(usdcBalance)} USDC
            </p>
          </div>
          <ErrorMessage error={vaultError} />
          <Button
            type="submit"
            className="w-full"
            disabled={!amount || parseFloat(amount) <= 0}
            loading={isFetchingVault}
          >
            Continue
          </Button>
        </form>
      )}

      {step === "confirm" && (
        <div className="space-y-4">
          <div className="space-y-2 p-3 rounded-(--widget-radius) bg-(--widget-row-bg)">
            <div className="flex justify-between text-sm">
              <span className="text-(--widget-muted)">Amount</span>
              <span className="font-medium">{formatCurrency(amount)} USDC</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-(--widget-muted)">Destination</span>
              <span>Bank Account</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-(--widget-muted)">Network</span>
              <span>Base Sepolia</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-(--widget-muted)">Gas Fee</span>
              <span className={isSponsored ? "text-(--widget-success)" : ""}>
                {isSponsored ? "Sponsored" : "User pays"}
              </span>
            </div>
          </div>
          <p className="text-xs text-(--widget-muted)">
            Your bank withdrawal will be processed in 1-3 business days.
          </p>
          <Button
            className="w-full"
            onClick={handleConfirm}
            loading={sendTx.isPending}
            disabled={!vaultAddress || !walletToUse || !networkData}
          >
            Confirm Withdrawal
          </Button>
          <ErrorMessage error={sendTx.error} />
        </div>
      )}
    </WidgetCard>
  );
}
