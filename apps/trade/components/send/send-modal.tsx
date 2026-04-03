"use client";

import { useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@dynamic-demos/ui";
import { useMockMode } from "@/contexts/mock-mode-context";
import { useMockBalances } from "@/hooks/use-mock-balances";
import { usePrimaryWallet } from "@/hooks/use-primary-wallet";
import { useSendTokenTransaction } from "@/hooks/use-send-transaction";
import { isEvmWalletAccount, type NetworkData } from "@/lib/dynamic";
import { TokenSelectStep, type TokenInfo } from "./token-select-step";
import { SendDetailsStep } from "./send-details-step";
import { ConfirmStep } from "./confirm-step";
import { SendResultStep } from "./send-result-step";

type SendStep = "token" | "details" | "confirm" | "result";

const STEP_TITLES: Record<SendStep, string> = {
  token: "Select Token",
  details: "Send Details",
  confirm: "Confirm Send",
  result: "Send",
};

interface SendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendModal({ open, onOpenChange }: SendModalProps) {
  const [step, setStep] = useState<SendStep>("token");
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState<NetworkData | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [mockPending, setMockPending] = useState(false);

  const { isMockMode } = useMockMode();
  const { deductBalance } = useMockBalances();
  const { primaryWallet } = usePrimaryWallet();
  const sendTx = useSendTokenTransaction();

  const reset = useCallback(() => {
    setStep("token");
    setSelectedToken(null);
    setRecipient("");
    setAmount("");
    setNetwork(null);
    setTxHash(null);
    setSendError(null);
    setMockPending(false);
    sendTx.reset();
  }, [sendTx]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) reset();
      onOpenChange(open);
    },
    [onOpenChange, reset],
  );

  const handleTokenSelect = (token: TokenInfo) => {
    setSelectedToken(token);
    setStep("details");
  };

  const handleDetailsContinue = (
    recipientAddr: string,
    amt: string,
    net: NetworkData,
  ) => {
    setRecipient(recipientAddr);
    setAmount(amt);
    setNetwork(net);
    setStep("confirm");
  };

  const handleConfirm = async () => {
    if (!selectedToken || !network) return;
    setSendError(null);

    if (isMockMode) {
      setMockPending(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const success = await deductBalance(selectedToken.symbol, parseFloat(amount));
      if (!success) {
        setMockPending(false);
        setSendError("Insufficient balance");
        return;
      }
      setMockPending(false);
      setTxHash("mock-tx");
      setStep("result");
      return;
    }

    if (!primaryWallet || !isEvmWalletAccount(primaryWallet)) {
      setSendError("No EVM wallet connected");
      return;
    }
    if (!selectedToken.contractAddress) {
      setSendError("Token contract address not available");
      return;
    }

    try {
      const hash = await sendTx.mutateAsync({
        walletAccount: primaryWallet,
        tokenAddress: selectedToken.contractAddress,
        decimals: selectedToken.decimals,
        amount,
        recipient,
        networkData: network,
      });
      setTxHash(hash);
      setStep("result");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  const handleBack = () => {
    if (step === "details") setStep("token");
    else if (step === "confirm") setStep("details");
  };

  const isLocked = step === "confirm" && sendTx.isPending;

  return (
    <Dialog open={open} onOpenChange={isLocked ? undefined : handleOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-trade-surface border-trade-border text-trade-text-primary"
        showCloseButton={!isLocked}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            {(step === "details" || step === "confirm") && (
              <button
                type="button"
                onClick={handleBack}
                className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all hover:bg-trade-bg"
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
            <TokenSelectStep onSelect={handleTokenSelect} />
          )}
          {step === "details" && selectedToken && (
            <SendDetailsStep
              token={selectedToken}
              onContinue={handleDetailsContinue}
            />
          )}
          {step === "confirm" && selectedToken && network && (
            <ConfirmStep
              token={selectedToken}
              recipient={recipient}
              amount={amount}
              network={network}
              onConfirm={handleConfirm}
              isPending={isMockMode ? mockPending : sendTx.isPending}
              error={sendError}
            />
          )}
          {step === "result" && selectedToken && network && (
            <SendResultStep
              token={selectedToken}
              amount={amount}
              txHash={txHash}
              networkId={network.networkId}
              error={sendError}
              onDone={() => handleOpenChange(false)}
              onRetry={() => {
                setSendError(null);
                setStep("confirm");
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
