"use client";

import { Button } from "@dynamic-demos/ui";
import {
  Check,
  Circle,
  Loader2,
  PartyPopper,
  AlertCircle,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import { useCheckout } from "@/lib/checkout-context";

function getStatusLabel(
  executionState?: string,
  settlementState?: string,
): string {
  switch (executionState) {
    case "failed":
      return "Transaction failed";
    case "cancelled":
      return "Transaction cancelled";
    case "expired":
      return "Transaction expired";
    case "broadcasted":
      return "Transaction broadcasted";
    case "source_confirmed":
      return "Source confirmed";
  }
  switch (settlementState) {
    case "completed":
      return "Payment complete";
    case "failed":
      return "Settlement failed";
    case "bridging":
      return "Bridging tokens...";
    case "routing":
      return "Routing payment...";
    case "settling":
      return "Settling payment...";
    case "swapping":
      return "Swapping tokens...";
  }
  return "Processing...";
}

export function ProcessingScreen() {
  const {
    screen,
    transaction,
    signingStep,
    error,
    walletDisplayName,
    isProcessing,
    pollingTimedOut,
    checkStatus,
    closeCheckout,
  } = useCheckout();

  const isComplete = screen === "complete";
  const isFailed = error !== null && !isProcessing && !isComplete;
  const executionState = transaction?.executionState;
  const settlementState = transaction?.settlementState;
  const txHash = transaction?.txHash;

  // ─── SUCCESS SCREEN ───
  if (isComplete) {
    return (
      <div className="flex flex-col items-center gap-5 py-4">
        <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <ShoppingBag className="h-8 w-8 text-green-500" />
        </div>

        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">
            Order Confirmed!
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your payment has been processed successfully.
          </p>
        </div>

        {txHash && (
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
          >
            View transaction
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        <div className="w-full border-t border-border pt-4 mt-1">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>Payment received</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>Order processed</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
            <PartyPopper className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span>Thank you for shopping with crypto!</span>
          </div>
        </div>

        <Button variant="primary" className="w-full mt-2" onClick={closeCheckout}>
          Continue Shopping
        </Button>
      </div>
    );
  }

  // ─── FAILURE SCREEN ───
  if (isFailed) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="font-semibold text-foreground">Payment Failed</p>
        <p className="text-sm text-destructive text-center">{error}</p>
        <Button variant="primary" className="w-full" onClick={closeCheckout}>
          Close
        </Button>
      </div>
    );
  }

  // ─── PROCESSING SCREEN ───

  // Step statuses
  const approvalDone =
    signingStep === "transaction" ||
    executionState === "signing" ||
    executionState === "broadcasted" ||
    executionState === "source_confirmed" ||
    (settlementState && settlementState !== "none");

  const signingDone =
    executionState === "broadcasted" ||
    executionState === "source_confirmed" ||
    (settlementState && settlementState !== "none");

  const confirmDone =
    executionState === "source_confirmed" ||
    (settlementState && settlementState !== "none");

  const settleDone =
    settlementState === "completed" ||
    // Direct transfer: no settlement needed
    (executionState === "source_confirmed" && settlementState === "none");

  const steps: { title: string; desc: string; status: StepStatus }[] = [
    {
      title: "Approve token",
      desc: signingStep === "approval"
        ? `Approve in ${walletDisplayName}...`
        : approvalDone
          ? "Approved"
          : "Waiting...",
      status: signingStep === "approval" ? "active" : approvalDone ? "completed" : "pending",
    },
    {
      title: "Sign transaction",
      desc: signingStep === "transaction"
        ? `Confirm in ${walletDisplayName}...`
        : signingDone
          ? "Signed"
          : "Pending",
      status: signingStep === "transaction" ? "active" : signingDone ? "completed" : approvalDone && !signingStep ? "active" : "pending",
    },
    {
      title: "Confirm on-chain",
      desc: confirmDone
        ? "Confirmed"
        : executionState === "broadcasted"
          ? "Waiting for confirmation..."
          : "Pending",
      status: confirmDone ? "completed" : executionState === "broadcasted" ? "active" : "pending",
    },
    {
      title: "Settle payment",
      desc: settleDone
        ? "Payment settled"
        : settlementState && settlementState !== "none"
          ? getStatusLabel(executionState, settlementState)
          : "Pending",
      status: settleDone ? "completed" : settlementState && settlementState !== "none" ? "active" : "pending",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Status label — only show during polling phase (not initial signing) */}
      {executionState && executionState !== "created" && executionState !== "signing" && (
        <p className="text-sm text-muted-foreground text-center">
          {getStatusLabel(executionState, settlementState)}
        </p>
      )}

      {/* Step list */}
      <div className="flex flex-col gap-0">
        {steps.map((step, i) => (
          <div key={step.title} className="flex gap-3">
            <div className="flex flex-col items-center">
              <StepIcon status={step.status} />
              {i < steps.length - 1 && (
                <div
                  className={`w-px flex-1 min-h-6 ${
                    step.status === "completed" ? "bg-green-500" : "bg-border"
                  }`}
                />
              )}
            </div>
            <div className="pb-4">
              <p
                className={`text-sm font-medium ${
                  step.status !== "pending" ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Transaction hash */}
      {txHash && (
        <a
          href={`https://basescan.org/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
        >
          View on BaseScan
          <ExternalLink className="h-3 w-3" />
        </a>
      )}

      {/* Check Status button on timeout */}
      {pollingTimedOut && (
        <Button variant="outline" className="w-full" onClick={checkStatus}>
          Check Status
        </Button>
      )}
    </div>
  );
}

type StepStatus = "pending" | "active" | "completed";

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "completed":
      return (
        <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <Check className="h-3.5 w-3.5 text-white" />
        </div>
      );
    case "active":
      return (
        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
        </div>
      );
    default:
      return (
        <div className="h-6 w-6 rounded-full border border-border flex items-center justify-center flex-shrink-0">
          <Circle className="h-2 w-2 text-muted-foreground fill-current" />
        </div>
      );
  }
}
