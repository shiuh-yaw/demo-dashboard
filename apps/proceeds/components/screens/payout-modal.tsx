"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Zap,
  Check,
  ChevronLeft,
  AlertCircle,
  Loader2,
  Wallet,
} from "lucide-react";
import { Button, Input } from "@dynamic-demos/ui";
import {
  getEvmWalletAccount,
  getSmartWalletAccount,
  getActiveNetworkData,
  onEvent,
  offEvent,
} from "@/lib/dynamic";
import type { NetworkData } from "@dynamic-labs-sdk/client";
import { formatUsd, truncateAddress } from "@/lib/format";
import {
  setPayoutDemoRecord,
  clearPayoutDemo,
  type PayoutDemoRecord,
} from "@/lib/payout-demo-store";
import { PAYOUT_SIMULATION_MAX_USDC } from "@/lib/constants";
import type { MonthlyProceeds } from "@/lib/mock-data";

type Step = "amount" | "confirm" | "processing" | "done" | "error";

interface PayoutResult {
  orderId: string;
  status: string;
  mock: boolean;
}

const PROCESSING_STEPS = [
  { id: "compliance", label: "Compliance check" },
  { id: "aml", label: "AML screening" },
  { id: "fireblocks", label: "Submitting to Fireblocks" },
] as const;

function orderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    CREATED: "Submitted",
    AWAITING_PAYMENT: "Awaiting payment",
    PENDING_USER_ACTION: "Pending approval",
    PROCESSING: "Processing",
    COMPLETED: "Completed",
    SUBMITTED: "Submitted",
    CANCELED: "Cancelled",
    FAILED: "Failed",
  };
  return map[status] ?? status;
}

interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  month: MonthlyProceeds;
}

export function PayoutModal({ isOpen, onClose, month }: PayoutModalProps) {
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [payoutResult, setPayoutResult] = useState<PayoutResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeNetwork, setActiveNetwork] = useState<NetworkData | null>(null);
  const cancelledRef = useRef(false);

  // Auto-reset the demo record on any close path after a successful payout.
  function handleClose() {
    if (step === "done") clearPayoutDemo(month.monthKey);
    onClose();
  }

  // Read the active Dynamic chain when the modal opens and keep it in sync
  // with the wallet card / header switcher via SDK events.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const refresh = async () => {
      const walletAccount = getEvmWalletAccount();
      if (!walletAccount) return;
      const result = await getActiveNetworkData({ walletAccount });
      if (cancelled) return;
      if (result.networkData) {
        setActiveNetwork(result.networkData as NetworkData);
      }
    };

    refresh().catch(() => {});

    const listener = () => {
      refresh().catch(() => {});
    };
    onEvent({ event: "walletAccountsChanged", listener });

    return () => {
      cancelled = true;
      offEvent({ event: "walletAccountsChanged", listener });
    };
  }, [isOpen]);

  const activeChainId = activeNetwork ? Number(activeNetwork.networkId) : null;
  const networkDisplay = activeNetwork
    ? `${activeNetwork.displayName} (USDC)`
    : "—";

  useEffect(() => {
    if (isOpen) {
      cancelledRef.current = false;
      setStep("amount");
      setAmount(String(month.totalUsdc));
      setCompletedSteps([]);
      setPayoutResult(null);
      setErrorMessage("");
    } else {
      cancelledRef.current = true;
    }
  }, [isOpen, month.totalUsdc]);

  if (!isOpen) return null;

  const smartWallet = getSmartWalletAccount();
  const evmWallet = getEvmWalletAccount();
  const walletAddress = smartWallet?.address ?? evmWallet?.address ?? null;
  const amountNum = parseFloat(amount);
  const isWithinDemoCap = amountNum <= PAYOUT_SIMULATION_MAX_USDC;
  const canContinue =
    !isNaN(amountNum) &&
    amountNum > 0 &&
    isWithinDemoCap &&
    !!walletAddress &&
    !!activeChainId;
  const canClose = step !== "processing";

  async function runPayout() {
    if (!walletAddress || !activeChainId) return;
    setCompletedSteps([]);
    setStep("processing");

    const stepIds = PROCESSING_STEPS.map((s) => s.id);

    const apiPromise = fetch("/api/payout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountUsdc: amountNum,
        walletAddress,
        monthKey: month.monthKey,
        chainId: activeChainId,
      }),
    }).then(async (res) => {
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<PayoutResult>;
    });

    // Animate first 2 compliance steps on fixed delays
    [700, 1500].forEach((delay, i) => {
      setTimeout(() => {
        if (!cancelledRef.current) {
          setCompletedSteps((prev) => [...prev, stepIds[i]!]);
        }
      }, delay);
    });

    await new Promise((r) => setTimeout(r, 1800));

    try {
      const result = await apiPromise;
      if (cancelledRef.current) return;

      setCompletedSteps(stepIds);
      setPayoutResult(result);

      const record: PayoutDemoRecord = {
        monthKey: month.monthKey,
        settlementHash: result.orderId,
        paidAt: new Date().toISOString(),
        amountUsdc: amountNum,
      };
      setPayoutDemoRecord(record);

      setTimeout(() => {
        if (!cancelledRef.current) setStep("done");
      }, 400);
    } catch (err) {
      if (cancelledRef.current) return;
      setCompletedSteps(stepIds.slice(0, 2));
      setErrorMessage(err instanceof Error ? err.message : "Payout failed");
      setStep("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => {
        if (canClose && e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-(--widget-bg) rounded-(--widget-radius-lg) shadow-xl w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payout-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-(--widget-border)">
          <div className="flex items-center gap-2">
            {step === "confirm" && (
              <button
                onClick={() => setStep("amount")}
                className="p-1 rounded-md text-(--widget-muted) hover:text-(--widget-fg) transition-colors"
                aria-label="Back"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <Zap className="w-4 h-4 text-(--widget-primary)" />
            <h2
              id="payout-modal-title"
              className="text-base font-semibold text-(--widget-fg)"
            >
              {step === "amount" && "Pay out proceeds"}
              {step === "confirm" && "Confirm payout"}
              {step === "processing" && "Processing"}
              {step === "done" && "Payout submitted"}
              {step === "error" && "Payout failed"}
            </h2>
          </div>
          {canClose && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-md text-(--widget-muted) hover:text-(--widget-fg) hover:bg-(--widget-row-hover) transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
          {/* ── Step 1: Amount ── */}
          {step === "amount" && (
            <div className="space-y-4">
              <Input
                label="Amount (USDC)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                max={String(PAYOUT_SIMULATION_MAX_USDC)}
                step="0.01"
              />
              {!isNaN(amountNum) && amountNum > 0 && !isWithinDemoCap && (
                <p className="text-xs text-(--widget-status-failed-fg)">
                  Demo limit is {PAYOUT_SIMULATION_MAX_USDC} USDC per payout.
                </p>
              )}

              {/* Destination wallet */}
              {walletAddress ? (
                <div className="rounded-(--widget-radius) bg-(--widget-row-bg) border border-(--widget-border) p-3">
                  <p className="text-xs text-(--widget-muted) mb-1">
                    Sending to
                  </p>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-(--widget-primary) flex-shrink-0" />
                    <p className="text-sm font-mono font-medium text-(--widget-fg)">
                      {truncateAddress(walletAddress)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 p-3 rounded-(--widget-radius) bg-(--widget-row-bg) border border-(--widget-border)">
                  <AlertCircle className="w-4 h-4 text-(--widget-muted) flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-(--widget-muted)">
                    No stablecoin wallet found. Create one on the Payment
                    methods page.
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                disabled={!canContinue}
                onClick={() => setStep("confirm")}
              >
                Continue
              </Button>
            </div>
          )}

          {/* ── Step 2: Confirm ── */}
          {step === "confirm" && walletAddress && (
            <div className="space-y-4">
              <p className="text-xs text-(--widget-muted)">
                Review the payout details before submitting to Fireblocks. Funds
                will be on-chain within minutes.
              </p>

              <div className="rounded-(--widget-radius) bg-(--widget-row-bg) border border-(--widget-border) divide-y divide-(--widget-border) text-xs">
                <div className="flex justify-between px-3 py-2.5">
                  <span className="text-(--widget-muted)">Period</span>
                  <span className="font-medium text-(--widget-fg)">
                    {month.month}
                  </span>
                </div>
                <div className="flex justify-between px-3 py-2.5">
                  <span className="text-(--widget-muted)">Amount</span>
                  <span className="font-medium text-(--widget-fg)">
                    {formatUsd(amountNum)} USDC
                  </span>
                </div>
                <div className="flex justify-between px-3 py-2.5">
                  <span className="text-(--widget-muted)">
                    Recipient wallet
                  </span>
                  <span className="font-mono font-medium text-(--widget-fg)">
                    {truncateAddress(walletAddress)}
                  </span>
                </div>
                <div className="flex justify-between px-3 py-2.5">
                  <span className="text-(--widget-muted)">Network</span>
                  <span className="font-medium text-(--widget-fg)">
                    {networkDisplay}
                  </span>
                </div>
                {/* <div className="flex justify-between px-3 py-2.5">
                  <span className="text-(--widget-muted)">Settlement</span>
                  <span className="font-medium text-(--widget-fg)">
                    MTLco on-ramp
                  </span>
                </div> */}
              </div>

              <Button className="w-full" onClick={runPayout}>
                Send payout
              </Button>
            </div>
          )}

          {/* ── Step 3: Processing ── */}
          {step === "processing" && (
            <div className="space-y-5 py-2">
              <p className="text-xs text-(--widget-muted) text-center">
                Running compliance checks and submitting to Fireblocks…
              </p>

              <div className="space-y-3">
                {PROCESSING_STEPS.map((s, i) => {
                  const isDone = completedSteps.includes(s.id);
                  const isActive =
                    !isDone &&
                    (i === 0 ||
                      completedSteps.includes(PROCESSING_STEPS[i - 1]!.id));

                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                        {isDone ? (
                          <div className="w-6 h-6 rounded-full bg-(--widget-success) flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </div>
                        ) : isActive ? (
                          <Loader2 className="w-5 h-5 text-(--widget-primary) animate-spin" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-(--widget-border)" />
                        )}
                      </div>
                      <span
                        className={`text-sm ${
                          isDone
                            ? "text-(--widget-fg) font-medium"
                            : isActive
                              ? "text-(--widget-fg)"
                              : "text-(--widget-muted)"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-(--widget-muted) text-center pt-2">
                Powered by MTLco × Fireblocks
              </p>
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === "done" && payoutResult && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="w-12 h-12 rounded-full bg-(--widget-success) flex items-center justify-center">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-(--widget-fg)">
                    Payout submitted
                  </p>
                  <p className="text-xs text-(--widget-muted) mt-0.5">
                    {formatUsd(amountNum)} USDC · {month.month}
                  </p>
                </div>
              </div>

              <div className="rounded-(--widget-radius) bg-(--widget-row-bg) border border-(--widget-border) divide-y divide-(--widget-border) text-xs">
                <div className="flex justify-between px-3 py-2.5">
                  <span className="text-(--widget-muted)">Order ID</span>
                  <span className="font-mono text-(--widget-fg) text-right max-w-48 truncate">
                    {payoutResult.orderId}
                  </span>
                </div>
                <div className="flex justify-between px-3 py-2.5">
                  <span className="text-(--widget-muted)">Status</span>
                  <span className="font-medium text-(--widget-fg)">
                    {orderStatusLabel(payoutResult.status)}
                  </span>
                </div>
                {payoutResult.mock && (
                  <div className="flex justify-between px-3 py-2.5">
                    <span className="text-(--widget-muted)">Mode</span>
                    <span
                      className="font-medium"
                      style={{ color: "var(--widget-status-pending-fg)" }}
                    >
                      Demo (simulated)
                    </span>
                  </div>
                )}
              </div>

              <Button className="w-full" onClick={handleClose}>
                Close
              </Button>
            </div>
          )}

          {/* ── Step 5: Error ── */}
          {step === "error" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-2">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "var(--widget-status-failed-bg)" }}
                >
                  <AlertCircle
                    className="w-6 h-6"
                    style={{ color: "var(--widget-status-failed-fg)" }}
                  />
                </div>
                <p className="text-sm font-medium text-(--widget-fg) text-center">
                  Something went wrong
                </p>
              </div>

              <div
                className="p-3 rounded-(--widget-radius)"
                style={{
                  backgroundColor: "var(--widget-status-failed-bg)",
                  border: "1px solid var(--widget-status-failed-border)",
                }}
              >
                <p
                  className="text-xs"
                  style={{ color: "var(--widget-status-failed-fg)" }}
                >
                  {errorMessage}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep("amount");
                    setErrorMessage("");
                  }}
                >
                  Try again
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
