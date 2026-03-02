"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dynamic-demos/ui";
import { Input } from "@dynamic-demos/ui";
import { Button } from "@dynamic-demos/ui";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { WalletSelect } from "@/components/wallet-select";
import { type WalletAccount } from "@/lib/dynamic";
import { formatCurrency } from "@dynamic-demos/utils";
import {
  Plus,
  ChevronRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import ConnectWalletScreen, { type WalletGroup } from "./connect-wallet-screen";
import { useWallets } from "@/hooks/use-wallets";
import { useWithdrawValidation } from "@/hooks/use-withdraw-validation";
import { useSendToWallet } from "@/hooks/use-send-to-wallet";
import { useCreatorBalanceOptional } from "@/contexts/creator-balance-context";

interface WithdrawToWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when withdrawal transaction succeeds */
  onSuccess?: (amount: number, wallet: WalletAccount, txHash: string) => void;
}

type Screen = "main" | "connect-wallet" | "connect-wallet-chain";

export function WithdrawToWalletModal({
  open,
  onOpenChange,
  onSuccess,
}: WithdrawToWalletModalProps) {
  const [screen, setScreen] = useState<Screen>("main");
  const [amount, setAmount] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<WalletAccount | null>(
    null
  );
  const [selectedWalletForChain, setSelectedWalletForChain] =
    useState<WalletGroup | null>(null);
  const [walletSelectOpen, setWalletSelectOpen] = useState(false);
  const [error, setError] = useState<{
    title: string;
    message: string;
    type: "error" | "warning";
  } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isWalletConnectMode, setIsWalletConnectMode] = useState(false);
  const [exitWalletConnect, setExitWalletConnect] = useState(false);

  const { wallets, getDefaultWallet } = useWallets();
  const creatorBalance = useCreatorBalanceOptional();

  // Use real creator balance, fallback to 0 if not loaded
  const availableAmount = useMemo(() => {
    if (!creatorBalance?.balance) return 0;
    return parseFloat(creatorBalance.balance) || 0;
  }, [creatorBalance?.balance]);

  const {
    isPending,
    sendToWallet,
    reset: resetSendToWallet,
  } = useSendToWallet({
    onSuccess: (txHash) => {
      const amountNum = parseFloat(amount) || 0;
      // Optimistically deduct from creator balance
      creatorBalance?.deductBalance(amountNum);
      setShowSuccess(true);
      // Close after showing success
      setTimeout(() => {
        if (selectedWallet) {
          onSuccess?.(amountNum, selectedWallet, txHash);
        }
        handleClose();
      }, 1500);
    },
    onError: (err) => {
      setError({
        title: "Transaction Error",
        message: err.message,
        type: "error",
      });
    },
  });

  // Set default wallet when wallets are loaded
  useEffect(() => {
    if (open && wallets.length > 0 && !selectedWallet) {
      const defaultWallet = getDefaultWallet();
      if (defaultWallet) {
        setSelectedWallet(defaultWallet);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, wallets.length, getDefaultWallet]);

  const validation = useWithdrawValidation(
    amount,
    availableAmount,
    !!selectedWallet
  );

  const handleConnectWallet = useCallback(() => {
    setScreen("connect-wallet");
    setError(null);
  }, []);

  const handleWalletConnected = useCallback(() => {
    setScreen("main");
    setSelectedWalletForChain(null);
    setError(null);
    // Refresh will happen automatically via useWallets hook
    const defaultWallet = getDefaultWallet();
    if (defaultWallet && !selectedWallet) {
      setSelectedWallet(defaultWallet);
    }
  }, [getDefaultWallet, selectedWallet]);

  const handleNavigateToChainSelect = useCallback((wallet: WalletGroup) => {
    setSelectedWalletForChain(wallet);
    setScreen("connect-wallet-chain");
  }, []);

  const handleBackFromChainSelect = useCallback(() => {
    setSelectedWalletForChain(null);
    setScreen("connect-wallet");
  }, []);

  const handleBack = useCallback(() => {
    if (isWalletConnectMode) {
      // Exit WalletConnect mode, stay on connect-wallet screen
      setExitWalletConnect(true);
      setIsWalletConnectMode(false);
      // Reset exitWalletConnect after a tick
      setTimeout(() => setExitWalletConnect(false), 0);
    } else if (screen === "connect-wallet-chain") {
      handleBackFromChainSelect();
    } else if (screen === "connect-wallet") {
      setScreen("main");
    }
  }, [screen, handleBackFromChainSelect, isWalletConnectMode]);

  const handleWithdraw = useCallback(async () => {
    setError(null);

    if (!validation.isValid) {
      setError({
        title: "Validation Error",
        message: validation.error || "Invalid withdrawal request",
        type: "error",
      });
      return;
    }

    if (!amount || !selectedWallet?.address) return;

    try {
      await sendToWallet({
        toAddress: selectedWallet.address,
        amountDollars: parseFloat(amount),
      });
    } catch {
      // Error is handled by the hook's onError callback
    }
  }, [amount, selectedWallet, validation, sendToWallet]);

  const handleClose = useCallback(() => {
    if (isPending) return; // Don't allow closing while transaction is pending
    onOpenChange(false);
    setScreen("main");
    setAmount("");
    setSelectedWalletForChain(null);
    setError(null);
    setShowSuccess(false);
    setIsWalletConnectMode(false);
    setExitWalletConnect(false);
    resetSendToWallet();
  }, [onOpenChange, isPending, resetSendToWallet]);

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Allow empty string, numbers, and decimal point
      if (value === "" || /^\d*\.?\d*$/.test(value)) {
        setAmount(value);
        setError(null);
      }
    },
    []
  );

  const handleUseMax = useCallback(() => {
    setAmount(availableAmount.toString());
    setError(null);
  }, [availableAmount]);

  const isWithdrawDisabled = useMemo(
    () =>
      !validation.isValid ||
      !amount ||
      !selectedWallet ||
      isPending ||
      showSuccess,
    [validation.isValid, amount, selectedWallet, isPending, showSuccess]
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {(screen === "connect-wallet" ||
              screen === "connect-wallet-chain") && (
              <button
                type="button"
                onClick={handleBack}
                className="hover:bg-gray-100 rounded-lg p-1 -ml-1 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4 text-earn-text-primary" />
              </button>
            )}
            {screen === "main" && (
              <Wallet className="w-5 h-5 text-earn-text-secondary" />
            )}
            {screen === "main"
              ? "Withdraw to Wallet"
              : screen === "connect-wallet-chain"
              ? "Select Network"
              : isWalletConnectMode
              ? "WalletConnect"
              : "Connect Wallet"}
          </DialogTitle>
          <DialogDescription>
            {screen === "main"
              ? "Transfer funds to your crypto wallet on-chain"
              : screen === "connect-wallet-chain"
              ? `Connect with ${
                  selectedWalletForChain?.displayName || "wallet"
                }`
              : isWalletConnectMode
              ? "Scan QR code with your mobile wallet"
              : "Choose how you would like to connect"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert
            title={error.title}
            message={error.message}
            type={error.type}
            onDismiss={() => setError(null)}
          />
        )}

        {screen === "main" && (
          <div className="space-y-4">
            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={availableAmount}
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  disabled={isPending || showSuccess}
                  className="pr-16"
                  aria-describedby="amount-help"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-earn-text-secondary">
                  USDC
                </div>
              </div>
              <div
                id="amount-help"
                className="flex items-center justify-between text-xs text-earn-text-secondary"
              >
                <span>Available: {formatCurrency(availableAmount)} USDC</span>
                <button
                  type="button"
                  onClick={handleUseMax}
                  disabled={isPending || showSuccess}
                  className="text-earn-active-text hover:underline disabled:opacity-50"
                >
                  Use max
                </button>
              </div>
            </div>

            {/* Wallet Selection */}
            {wallets.length > 0 && (
              <div className="space-y-2">
                <Label>Select Wallet</Label>
                <WalletSelect
                  wallets={wallets}
                  selectedWallet={selectedWallet}
                  onSelect={setSelectedWallet}
                  open={walletSelectOpen}
                  onOpenChange={setWalletSelectOpen}
                  disabled={isPending || showSuccess}
                />
              </div>
            )}

            {/* Connect New Wallet Button */}
            <button
              type="button"
              onClick={handleConnectWallet}
              disabled={isPending || showSuccess}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-earn-border/60 hover:bg-gray-50/50 transition-colors text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                <Plus className="w-4 h-4 text-earn-text-secondary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-earn-text-primary">
                  Connect New Wallet
                </p>
                <p className="text-xs text-earn-text-secondary">
                  Link an external wallet
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-earn-text-secondary shrink-0" />
            </button>

            {/* Withdraw Button */}
            <Button
              onClick={handleWithdraw}
              disabled={isWithdrawDisabled}
              className="w-full"
            >
              {showSuccess ? (
                <CheckCircle2 className="h-5 w-5 text-white" />
              ) : isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                `Withdraw ${amount ? formatCurrency(amount) : "0.00"} USDC`
              )}
            </Button>
          </div>
        )}

        {/* Connect Wallet Screen */}
        {(screen === "connect-wallet" || screen === "connect-wallet-chain") && (
          <ConnectWalletScreen
            title="Connect Wallet"
            subtitle="Choose how you would like to connect"
            onSuccess={handleWalletConnected}
            onError={(title, message, type) =>
              setError({ title, message, type })
            }
            onClearError={() => setError(null)}
            onBack={handleBack}
            selectedWalletForChain={
              screen === "connect-wallet-chain" ? selectedWalletForChain : null
            }
            onNavigateToChainSelect={handleNavigateToChainSelect}
            onWalletConnectModeChange={setIsWalletConnectMode}
            exitWalletConnect={exitWalletConnect}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
