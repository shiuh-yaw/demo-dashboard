"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  X,
  Zap,
  Check,
  ChevronLeft,
  AlertCircle,
  Loader2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Button, Input } from "@dynamic-demos/ui";
import { useTrack } from "@dynamic-demos/analytics";
import { usePayoutContext } from "@/contexts/payout-context";
import { useActiveNetwork } from "@/hooks/use-active-network";
import { useExternalWalletLabel } from "@/hooks/use-external-wallet-label";
import { MOCK_BANK_ACCOUNT, MOCK_CARD } from "@/lib/mock-data";
import { PAYOUT_SIMULATION_MAX_USD } from "@/lib/constants";
import { getUserName } from "@/lib/dynamic";
import { getExchangeDisplay } from "@/lib/exchanges-registry";
import { EXTERNAL_WALLET_PROVIDER_PREFIX } from "@/components/screens/connect-external-wallet-modal";
import { truncateAddress } from "@/lib/format";

type Step = "amount" | "confirm" | "processing" | "done" | "error";

interface PayoutResult {
  visaDirectTxId: string;
  fireblocksId: string;
  fireblocksStatus: string;
}

const WALLET_STEPS = [
  { id: "wallet", label: "Wallet verification" },
  { id: "aml", label: "AML screening" },
  { id: "sanctions", label: "Sanctions check" },
  { id: "execute", label: "Executing via Fireblocks" },
] as const;

const BANK_STEPS = [
  { id: "verify", label: "Verifying account" },
  { id: "ach", label: "Processing ACH transfer" },
  { id: "submit", label: "Submitting to bank" },
] as const;

const CARD_STEPS = [
  { id: "verify", label: "Verifying card" },
  { id: "push", label: "Processing push to card" },
  { id: "submit", label: "Completing transfer" },
] as const;

function resolveProviderName(
  walletProvider: string | null,
  externalWalletLabel: string | null,
): string {
  if (walletProvider === "embedded") return "Embedded wallet";
  if (!walletProvider) return "Wallet";
  if (walletProvider.startsWith(EXTERNAL_WALLET_PROVIDER_PREFIX)) {
    // `external:{providerKey}` — pull the friendly brand ("MetaMask",
    // "Coinbase Wallet", …) from Dynamic's provider metadata, with a
    // neutral fallback during the hydration window before the SDK has
    // reported its provider list.
    return externalWalletLabel ?? "External wallet";
  }
  return getExchangeDisplay(walletProvider).name;
}

function methodLabel(
  method: string,
  walletAddress: string | null,
  walletProvider: string | null,
  externalWalletLabel: string | null,
): string {
  if (method === "wallet" && walletAddress) {
    const provider = resolveProviderName(walletProvider, externalWalletLabel);
    return `${provider} · ${truncateAddress(walletAddress)}`;
  }
  if (method === "bank") return `${MOCK_BANK_ACCOUNT.bank} ${MOCK_BANK_ACCOUNT.accountMasked}`;
  if (method === "card") return `${MOCK_CARD.network} ${MOCK_CARD.cardMasked}`;
  return "Unknown";
}

interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PayoutModal({ isOpen, onClose }: PayoutModalProps) {
  const { defaultMethod, walletAddress, walletProvider } = usePayoutContext();
  const { milestone } = useTrack();
  const router = useRouter();
  const { networkLabel } = useActiveNetwork();
  const externalWalletLabel = useExternalWalletLabel(walletProvider);
  const isExternalWallet = !!walletProvider?.startsWith(
    EXTERNAL_WALLET_PROVIDER_PREFIX,
  );
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [payoutResult, setPayoutResult] = useState<PayoutResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [userName, setUserName] = useState<{ firstName: string; lastName: string } | undefined>();

  useEffect(() => {
    getUserName().then(setUserName).catch(() => {});
  }, []);

  const cancelledRef = useRef(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      cancelledRef.current = false;
      setStep("amount");
      setAmount("");
      setCompletedSteps([]);
      setPayoutResult(null);
      setErrorMessage("");
    } else {
      cancelledRef.current = true;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasWallet = !!walletAddress;
  const amountNum = parseFloat(amount);
  const isWalletPayout = defaultMethod === "wallet";
  const exceedsLimit =
    !isNaN(amountNum) && amountNum > PAYOUT_SIMULATION_MAX_USD;
  // Wallet method requires a configured wallet; bank/card always available
  const canContinue =
    !isNaN(amountNum) &&
    amountNum > 0 &&
    !exceedsLimit &&
    (isWalletPayout ? hasWallet : true);

  const processingSteps =
    defaultMethod === "card" ? CARD_STEPS :
    defaultMethod === "bank" ? BANK_STEPS :
    WALLET_STEPS;

  // Network label shown in confirm / done rows.
  // Embedded wallets live on Dynamic's active network; for CeFi (BYO)
  // and external wallets the chain is decided by whichever provider the
  // user used, so we fall back to "Ethereum" — the chain USDC payouts
  // land on in this demo — rather than surfacing the technical "EVM"
  // term to hosts.
  const walletNetworkLabel =
    walletProvider === "embedded" ? networkLabel ?? "Ethereum" : "Ethereum";

  // Called from confirm step — kicks off API + animation
  async function runPayout() {
    milestone("payout_initiated");
    setCompletedSteps([]);
    setStep("processing");

    const stepIds = processingSteps.map((s) => s.id);

    if (isWalletPayout && walletAddress) {
      // Real Fireblocks payout flow
      const apiPromise = fetch("/api/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountNum, walletAddress, firstName: userName?.firstName, lastName: userName?.lastName }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const data = (await res.json()) as { error?: string };
            throw new Error(data.error ?? `HTTP ${res.status}`);
          }
          return res.json() as Promise<PayoutResult & { success: boolean }>;
        });

      // Animate first 3 compliance steps on fixed delays
      [700, 1500, 2200].forEach((delay, i) => {
        setTimeout(() => {
          if (!cancelledRef.current) {
            setCompletedSteps((prev) => [...prev, stepIds[i]!]);
          }
        }, delay);
      });

      await new Promise((r) => setTimeout(r, 2200));

      try {
        const result = await apiPromise;
        if (cancelledRef.current) return;

        setCompletedSteps(stepIds);
        setPayoutResult(result);
        milestone("payout_completed");

        // Invalidate the Next.js Router Cache so the next navigation
        // to /transactions re-runs the server component and picks up
        // the new Fireblocks order.
        router.refresh();

        setTimeout(() => {
          if (!cancelledRef.current) setStep("done");
        }, 400);
      } catch (err) {
        if (cancelledRef.current) return;
        setCompletedSteps(stepIds.slice(0, 3));
        setErrorMessage(err instanceof Error ? err.message : "Payout failed");
        setStep("error");
      }
    } else {
      // Simulated traditional payout (bank ACH / push to card)
      const delays = [600, 1400, 2000];
      delays.forEach((delay, i) => {
        setTimeout(() => {
          if (!cancelledRef.current) {
            setCompletedSteps((prev) => [...prev, stepIds[i]!]);
          }
        }, delay);
      });

      await new Promise((r) => setTimeout(r, 2400));
      if (cancelledRef.current) return;

      setCompletedSteps(stepIds);
      setPayoutResult({
        visaDirectTxId: `VD-${Date.now()}`,
        fireblocksId: defaultMethod === "bank" ? `ACH-${Date.now()}` : `PTC-${Date.now()}`,
        fireblocksStatus: "COMPLETED",
      });
      milestone("payout_completed");

      setTimeout(() => {
        if (!cancelledRef.current) setStep("done");
      }, 400);
    }
  }

  const canClose = step !== "processing";

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40">
      <div
        className="bg-(--brand-surface) rounded-(--brand-radius-lg) shadow-xl w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payout-modal-title"
      >
        {/* Header — hidden on the "done" step since that step is
            self-titled by the big clock-icon hero and the final
            "Close" button; dropping it saves a meaningful chunk of
            vertical space. */}
        {step !== "done" && (
          <div className="flex items-center justify-between p-6 border-b border-(--brand-border)">
            <div className="flex items-center gap-2">
              {step === "confirm" && (
                <button
                  onClick={() => setStep("amount")}
                  className="p-1 rounded-md text-(--brand-muted) hover:text-(--brand-fg) transition-colors"
                  aria-label="Back"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <Zap className="w-4 h-4 text-(--brand-primary)" />
              <h2
                id="payout-modal-title"
                className="text-base font-semibold text-(--brand-fg)"
              >
                {step === "amount" && "Simulate payout"}
                {step === "confirm" && "Confirm payout"}
                {step === "processing" && "Processing"}
                {step === "error" && "Payout failed"}
              </h2>
            </div>
            {canClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-(--brand-muted) hover:text-(--brand-fg) hover:bg-(--brand-row-hover) transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-6">
          {/* ── Step 1: Amount ── */}
          {step === "amount" && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-(--brand-fg)">
                    Amount (USD)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAmount(PAYOUT_SIMULATION_MAX_USD.toFixed(2))
                    }
                    className="text-xs text-(--brand-primary) hover:underline"
                  >
                    Max
                  </button>
                </div>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  max={PAYOUT_SIMULATION_MAX_USD}
                  step="0.01"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-(--brand-muted)">
                    Demo limit: ${PAYOUT_SIMULATION_MAX_USD.toFixed(2)} USDC per
                    payout
                  </span>
                  {exceedsLimit && (
                    <span className="text-xs text-(--brand-error)">
                      Exceeds demo limit
                    </span>
                  )}
                </div>
              </div>

              {/* Payout to */}
              <div className="rounded-(--brand-radius) bg-(--brand-row-bg) border border-(--brand-border) p-3">
                <p className="text-xs text-(--brand-muted) mb-1">Payout to</p>
                <p className="text-sm font-medium text-(--brand-fg)">
                  {methodLabel(
                    defaultMethod,
                    walletAddress,
                    walletProvider,
                    externalWalletLabel,
                  )}
                </p>
              </div>

              {/* No wallet warning — only shown when wallet is the selected method */}
              {isWalletPayout && !hasWallet && (
                <div className="flex gap-2 p-3 rounded-(--brand-radius) bg-(--brand-row-bg) border border-(--brand-border)">
                  <AlertCircle className="w-4 h-4 text-(--brand-muted) flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-(--brand-muted)">
                    Set up a stablecoin wallet on the Payment methods page to
                    receive USDC payouts.
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
          {step === "confirm" && (
            <div className="space-y-4">
              {!isWalletPayout && (
                <p className="text-xs text-(--brand-muted)">
                  {`Review the ${defaultMethod === "bank" ? "ACH transfer" : "push-to-card"} details before sending.`}
                </p>
              )}

              <div className="rounded-(--brand-radius) bg-(--brand-row-bg) border border-(--brand-border) divide-y divide-(--brand-border) text-xs">
                <div className="flex justify-between px-3 py-2.5">
                  <span className="text-(--brand-muted)">Amount</span>
                  <span className="font-medium text-(--brand-fg)">
                    ${amountNum.toFixed(2)} USD
                  </span>
                </div>

                {isWalletPayout ? (
                  <>
                    <div className="flex justify-between px-3 py-2.5">
                      <span className="text-(--brand-muted)">Asset</span>
                      <span className="font-medium text-(--brand-fg)">
                        USDC · {walletNetworkLabel}
                      </span>
                    </div>
                    <div className="flex justify-between px-3 py-2.5">
                      <span className="text-(--brand-muted)">Recipient wallet</span>
                      <span className="font-mono font-medium text-(--brand-fg)">
                        {walletAddress ? truncateAddress(walletAddress) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between px-3 py-2.5">
                      <span className="text-(--brand-muted)">Payout method</span>
                      <span className="font-medium text-(--brand-fg)">
                        {walletProvider === "embedded"
                          ? "Embedded Wallet"
                          : isExternalWallet
                            ? "External Wallet"
                            : "Exchange Wallet"}
                      </span>
                    </div>
                  </>
                ) : defaultMethod === "bank" ? (
                  <>
                    <div className="flex justify-between px-3 py-2.5">
                      <span className="text-(--brand-muted)">Destination</span>
                      <span className="font-medium text-(--brand-fg)">
                        {MOCK_BANK_ACCOUNT.bank} {MOCK_BANK_ACCOUNT.accountMasked}
                      </span>
                    </div>
                    <div className="flex justify-between px-3 py-2.5">
                      <span className="text-(--brand-muted)">Routing</span>
                      <span className="font-medium text-(--brand-fg)">
                        {MOCK_BANK_ACCOUNT.routingMasked}
                      </span>
                    </div>
                    <div className="flex justify-between px-3 py-2.5">
                      <span className="text-(--brand-muted)">Method</span>
                      <span className="font-medium text-(--brand-fg)">ACH transfer</span>
                    </div>
                    <div className="flex justify-between px-3 py-2.5">
                      <span className="text-(--brand-muted)">Settlement</span>
                      <span className="font-medium text-(--brand-fg)">1–2 business days</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between px-3 py-2.5">
                      <span className="text-(--brand-muted)">Destination</span>
                      <span className="font-medium text-(--brand-fg)">
                        {MOCK_CARD.network} {MOCK_CARD.cardMasked}
                      </span>
                    </div>
                    <div className="flex justify-between px-3 py-2.5">
                      <span className="text-(--brand-muted)">Card type</span>
                      <span className="font-medium text-(--brand-fg)">{MOCK_CARD.type}</span>
                    </div>
                    <div className="flex justify-between px-3 py-2.5">
                      <span className="text-(--brand-muted)">Method</span>
                      <span className="font-medium text-(--brand-fg)">Push to card</span>
                    </div>
                    <div className="flex justify-between px-3 py-2.5">
                      <span className="text-(--brand-muted)">Settlement</span>
                      <span className="font-medium text-(--brand-fg)">Instant</span>
                    </div>
                  </>
                )}
              </div>

              <Button className="w-full" onClick={runPayout}>
                Send payout
              </Button>
            </div>
          )}

          {/* ── Step 3: Processing ── */}
          {step === "processing" && (
            <div className="space-y-5 py-2">
              <p className="text-xs text-(--brand-muted) text-center">
                {isWalletPayout
                  ? "Running compliance checks and submitting to Fireblocks…"
                  : defaultMethod === "bank"
                    ? "Processing ACH transfer…"
                    : "Processing push to card…"}
              </p>

              <div className="space-y-3">
                {processingSteps.map((s, i) => {
                  const isDone = completedSteps.includes(s.id);
                  const isActive =
                    !isDone &&
                    (i === 0 || completedSteps.includes(processingSteps[i - 1]!.id));

                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                        {isDone ? (
                          <div className="w-6 h-6 rounded-full bg-(--brand-success) flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-white" />
                          </div>
                        ) : isActive ? (
                          <Loader2 className="w-5 h-5 text-(--brand-primary) animate-spin" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-(--brand-border)" />
                        )}
                      </div>
                      <span
                        className={`text-sm ${
                          isDone
                            ? "text-(--brand-fg) font-medium"
                            : isActive
                              ? "text-(--brand-fg)"
                              : "text-(--brand-muted)"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-(--brand-muted) text-center pt-2">
                Powered by Fireblocks
              </p>
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === "done" && payoutResult && (
            <div className="space-y-4">
              {/* Accessible label so the dialog keeps an aria-labelledby
                  target even though we hide the visible header bar on
                  this step. */}
              <h2 id="payout-modal-title" className="sr-only">
                Payout initiated
              </h2>
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-(--brand-fg)">
                    Payout initiated
                  </p>
                  <p className="text-xs text-(--brand-muted) mt-0.5">
                    {isWalletPayout
                      ? `$${amountNum.toFixed(2)} USDC · ${walletNetworkLabel}`
                      : `$${amountNum.toFixed(2)} USD · ${defaultMethod === "bank" ? "ACH transfer" : "Push to card"}`}
                  </p>
                </div>
              </div>

              {/* Pending-checks explainer */}
              <div className="rounded-(--brand-radius) bg-blue-50 border border-blue-200 p-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-blue-900">
                      Routing your payout
                    </p>
                    <p className="text-[11px] text-blue-800 mt-0.5 leading-snug">
                      Funds are moving through the settlement network now.
                      They&apos;ll arrive in the recipient wallet once the
                      transfer completes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-(--brand-radius) bg-(--brand-row-bg) border border-(--brand-border) divide-y divide-(--brand-border) text-xs">
                <div className="flex justify-between px-3 py-2.5">
                  <span className="text-(--brand-muted)">
                    {isWalletPayout ? "Fireblocks TX" : "Reference"}
                  </span>
                  <span className="font-mono text-(--brand-fg) text-right max-w-40 truncate">
                    {payoutResult.fireblocksId}
                  </span>
                </div>
              </div>

              <Button className="w-full" onClick={onClose}>
                Close
              </Button>
            </div>
          )}

          {/* ── Step 5: Error ── */}
          {step === "error" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--brand-status-failed-bg)" }}>
                  <AlertCircle className="w-6 h-6" style={{ color: "var(--brand-status-failed-fg)" }} />
                </div>
                <p className="text-sm font-medium text-(--brand-fg) text-center">
                  Something went wrong
                </p>
              </div>

              <div className="p-3 rounded-(--brand-radius) border border-(--brand-error)/30" style={{ backgroundColor: "var(--brand-status-failed-bg)" }}>
                <p className="text-xs" style={{ color: "var(--brand-status-failed-fg)" }}>{errorMessage}</p>
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
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
