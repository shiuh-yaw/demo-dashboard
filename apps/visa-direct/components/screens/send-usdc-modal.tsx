"use client";

/**
 * Send USDC modal.
 *
 * Demonstrates a real ERC-20 transfer from the host's embedded
 * ZeroDev kernel wallet, broadcast as a gas-sponsored
 * UserOperation. Balance refresh is intentionally delegated to the
 * caller via `onSuccess` — this modal stays focused on the send
 * flow and doesn't know which query keys / surfaces need
 * invalidating.
 *
 * States:
 *   form     — enter recipient + amount
 *   sending  — tx broadcast in-flight
 *   success  — show hash + explorer link
 *   error    — show failure reason + retry
 */

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, AlertTriangle, X } from "lucide-react";
import { Button, Input, Spinner } from "@dynamic-demos/ui";
import { sendUsdc } from "@/lib/transactions/send-usdc";
import { txUrl } from "@/lib/explorer";
import { truncateAddress } from "@/lib/format";
import { useActiveNetwork } from "@/hooks/use-active-network";
import { usePrimaryEvmAccount } from "@/hooks/use-primary-evm-account";

type Step = "form" | "sending" | "success" | "error";

interface SendUsdcModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current balance as a plain number (USDC). Used for cap + display. */
  balance: number;
  formattedBalance: string;
  onSuccess?: () => void;
}

export function SendUsdcModal({
  isOpen,
  onClose,
  balance,
  formattedBalance,
  onSuccess,
}: SendUsdcModalProps) {
  const walletAccount = usePrimaryEvmAccount();
  const { networkData, chainId, networkLabel } = useActiveNetwork();

  const [step, setStep] = useState<Step>("form");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setRecipient("");
      setAmount("");
      setTxHash("");
      setErrorMessage("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(recipient);
  const numericAmount = Number(amount);
  const isValidAmount = numericAmount > 0 && numericAmount <= balance;
  const canSend =
    isValidAddress && isValidAmount && !!walletAccount && !!networkData;

  async function handleSend() {
    if (!canSend || !walletAccount || !networkData) return;
    setStep("sending");
    setErrorMessage("");
    try {
      const hash = await sendUsdc({
        walletAccount,
        networkData,
        amount,
        recipient: recipient as `0x${string}`,
      });
      setTxHash(hash);
      setStep("success");
      onSuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transfer failed";
      // User rejected an SDK confirmation prompt — treat as a soft
      // cancel and drop them back to the form.
      if (/user.*(rejected|cancel|denied)|cancel/i.test(msg)) {
        setStep("form");
        setErrorMessage("Transfer cancelled. Try again when ready.");
        return;
      }
      setErrorMessage(msg);
      setStep("error");
    }
  }

  const explorerUrl = chainId && txHash ? txUrl(chainId, txHash) : null;
  const canClose = step !== "sending";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => {
        if (canClose && e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-(--widget-bg) rounded-(--widget-radius-lg) shadow-xl w-full max-w-md">
        {/* Header */}
        {step === "form" && (
          <div className="flex items-center justify-between p-6 border-b border-(--widget-border)">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-(--widget-row-bg) flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-(--widget-primary)" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-(--widget-fg)">
                  Send USDC
                </h2>
                <p className="text-xs text-(--widget-muted)">
                  {networkLabel ? `${networkLabel} · ` : ""}
                  Direct from your embedded wallet
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-(--widget-muted) hover:text-(--widget-fg) hover:bg-(--widget-row-hover) transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="p-6">
          {/* Step — form */}
          {step === "form" && (
            <div className="space-y-4">
              <div>
                <Input
                  label="Recipient address"
                  placeholder="0x…"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value.trim())}
                />
                {recipient && !isValidAddress && (
                  <p className="text-xs text-(--widget-error) mt-1">
                    Enter a valid Ethereum address
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-(--widget-fg)">
                    Amount
                  </span>
                  <button
                    type="button"
                    onClick={() => setAmount(balance.toString())}
                    className="text-xs text-(--widget-primary) hover:underline"
                    disabled={balance <= 0}
                  >
                    Max
                  </button>
                </div>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9.]/g, "");
                    if (cleaned.split(".").length <= 2) setAmount(cleaned);
                  }}
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-(--widget-muted)">
                    Available: {formattedBalance}
                  </span>
                  {amount && numericAmount > balance && (
                    <span className="text-xs text-(--widget-error)">
                      Exceeds balance
                    </span>
                  )}
                </div>
              </div>

              {errorMessage && (
                <p className="text-xs text-(--widget-error)">{errorMessage}</p>
              )}

              <Button
                className="w-full"
                onClick={handleSend}
                disabled={!canSend}
              >
                {walletAccount ? "Send USDC" : "Wallet not ready"}
              </Button>
            </div>
          )}

          {/* Step — sending */}
          {step === "sending" && (
            <div className="flex flex-col items-center py-12 gap-4">
              <Spinner size="lg" />
              <div className="text-center">
                <p className="text-base font-medium text-(--widget-fg)">
                  Sending {amount} USDC
                </p>
                <p className="text-sm text-(--widget-muted) mt-1">
                  Waiting for onchain confirmation…
                </p>
              </div>
            </div>
          )}

          {/* Step — success */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-(--widget-fg)">
                Transfer sent
              </p>
              <p className="text-sm text-(--widget-muted) text-center">
                {amount} USDC sent to {truncateAddress(recipient)}
              </p>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-(--widget-primary) hover:underline"
                >
                  View transaction →
                </a>
              )}
              <Button className="w-full mt-2" onClick={onClose}>
                Done
              </Button>
            </div>
          )}

          {/* Step — error */}
          {step === "error" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-lg font-semibold text-(--widget-fg)">
                Transfer failed
              </p>
              <p className="text-xs text-(--widget-muted) text-center max-w-[340px]">
                {errorMessage}
              </p>
              <div className="flex gap-3 w-full mt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={() => setStep("form")}>
                  Try again
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
