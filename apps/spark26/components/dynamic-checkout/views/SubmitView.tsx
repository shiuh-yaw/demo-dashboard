"use client";

// Fires `submitCheckoutTransaction` on mount. Shows a stepper for the two
// in-wallet prompts the SDK may trigger (ERC-20 approval + payment signature)
// so the user knows what to expect. Advances to `status` once the SDK
// resolves.
import { submitCheckoutTransaction } from "@dynamic-labs-sdk/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { GhostButton, Panel, PrimaryButton } from "../primitives.js";
import {
  deriveSignStepStatus,
  type SubmitStepId,
  type SubmitStepStatus,
} from "../submitSteps.js";
import type { SubmitViewProps } from "../types.js";

const STEP_LABELS: Record<SubmitStepId, { title: string; activeHint: string }> =
  {
    approval: {
      title: "Approve token spend",
      activeHint:
        "Approve in your wallet — this lets the router move your token.",
    },
    transaction: {
      title: "Sign payment transaction",
      activeHint: "Sign in your wallet to send the payment.",
    },
  };

export function SubmitView({
  transactionId,
  walletAccount,
  onSubmitted,
  onCancel,
}: SubmitViewProps) {
  const [currentStep, setCurrentStep] = useState<SubmitStepId | null>(null);
  const [seenSteps, setSeenSteps] = useState<ReadonlySet<SubmitStepId>>(
    new Set(),
  );

  const handleStepChange = (next: SubmitStepId) => {
    setCurrentStep(next);
    setSeenSteps((prev) => {
      const copy = new Set(prev);
      copy.add(next);
      return copy;
    });
  };

  const { error, refetch, isFetching } = useQuery({
    queryKey: ["submit", transactionId],
    queryFn: async () => {
      const result = await submitCheckoutTransaction({
        onStepChange: handleStepChange,
        transactionId,
        walletAccount,
      });
      onSubmitted();
      return result;
    },
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const rejected = isWalletRejection(error);

  // Fire cancel exactly once per false→true transition of `rejected`.
  // Parent's `onCancel` prop is an inline arrow, so its identity changes every
  // render — without this ref guard the effect re-fires on every re-render
  // after cancel and triggers "Maximum update depth exceeded".
  const prevRejectedRef = useRef(false);
  useEffect(() => {
    if (rejected && !prevRejectedRef.current) {
      onCancel();
    }
    prevRejectedRef.current = rejected;
  }, [rejected, onCancel]);

  const handleRetry = () => {
    setCurrentStep(null);
    setSeenSteps(new Set());
    void refetch();
  };

  if (error && !rejected) {
    const friendly = friendlyErrorMessage(error);
    return (
      <Panel>
        <div>
          <p className="label mb-2 text-[var(--color-pink-100)]">Interrupted</p>
          <h2 className="text-[22px] mb-2">{friendly.title}</h2>
          <p className="text-sm text-[color-mix(in_srgb,var(--color-blue-100)_75%,transparent)]">
            {friendly.message}
          </p>
          <p className="text-xs text-[color-mix(in_srgb,var(--color-blue-100)_55%,transparent)] mt-2">
            Nothing has been charged yet.
          </p>
          <details className="mt-3">
            <summary className="text-xs text-[color-mix(in_srgb,var(--color-blue-100)_45%,transparent)] cursor-pointer hover:text-[color-mix(in_srgb,var(--color-blue-100)_70%,transparent)]">
              Technical details
            </summary>
            <p className="text-[11px] font-mono mt-2 break-all text-[color-mix(in_srgb,var(--color-blue-100)_45%,transparent)]">
              {error.message}
            </p>
          </details>
        </div>
        <div className="flex flex-col gap-2">
          <PrimaryButton onClick={handleRetry} disabled={isFetching}>
            {isFetching ? "Retrying…" : "Try again"}
          </PrimaryButton>
          <GhostButton onClick={onCancel}>Cancel payment</GhostButton>
        </div>
      </Panel>
    );
  }

  const approvalStatus = deriveSignStepStatus("approval", currentStep, seenSteps);
  const transactionStatus = deriveSignStepStatus(
    "transaction",
    currentStep,
    seenSteps,
  );

  const headline = currentStep
    ? STEP_LABELS[currentStep].activeHint
    : "Preparing your payment…";

  return (
    <Panel step={4}>
      <div>
        <h2 className="text-[22px] mb-1">Complete payment</h2>
        <p className="text-sm text-[color-mix(in_srgb,var(--color-blue-100)_75%,transparent)]">
          {headline}
        </p>
      </div>

      <ol className="space-y-4">
        <StepRow
          index={1}
          title={STEP_LABELS.approval.title}
          status={approvalStatus}
        />
        <StepRow
          index={2}
          title={STEP_LABELS.transaction.title}
          status={transactionStatus}
        />
      </ol>

      <p className="text-xs text-center text-[color-mix(in_srgb,var(--color-blue-100)_55%,transparent)]">
        Keep this page open until both steps complete.
      </p>
    </Panel>
  );
}

function StepRow({
  index,
  title,
  status,
}: {
  index: number;
  title: string;
  status: SubmitStepStatus;
}) {
  return (
    <li className="flex items-start gap-3">
      <StepIndicator index={index} status={status} />
      <div className="flex-1 min-w-0 pt-0.5">
        <div
          className={
            status === "skipped"
              ? "text-[15px] text-white/40 line-through"
              : status === "pending"
                ? "text-[15px] text-[color-mix(in_srgb,var(--color-blue-100)_55%,transparent)]"
                : "text-[15px] font-semibold text-white"
          }
        >
          {title}
        </div>
        <div className="text-xs text-[color-mix(in_srgb,var(--color-blue-100)_55%,transparent)]">
          {statusLabel(status)}
        </div>
      </div>
    </li>
  );
}

function StepIndicator({
  index,
  status,
}: {
  index: number;
  status: SubmitStepStatus;
}) {
  if (status === "active") {
    return (
      <div className="relative h-7 w-7 shrink-0">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-[var(--color-blue)]/25 blur-md"
        />
        <div className="relative h-7 w-7 rounded-full border-2 border-[var(--color-blue)] border-t-transparent animate-spin" />
      </div>
    );
  }
  if (status === "done") {
    return (
      <div
        className="h-7 w-7 rounded-full flex items-center justify-center text-[var(--color-navy)] text-xs font-bold shrink-0"
        style={{
          background:
            "linear-gradient(135deg, var(--color-blue-100), var(--color-blue))",
          boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset",
        }}
      >
        ✓
      </div>
    );
  }
  if (status === "skipped") {
    return (
      <div className="h-7 w-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-xs shrink-0">
        —
      </div>
    );
  }
  return (
    <div className="h-7 w-7 rounded-full border border-white/15 flex items-center justify-center text-white/40 text-xs shrink-0">
      {index}
    </div>
  );
}

function statusLabel(status: SubmitStepStatus): string {
  switch (status) {
    case "active":
      return "Waiting for wallet…";
    case "done":
      return "Done";
    case "skipped":
      return "Not needed for this token";
    case "pending":
      return "Pending";
  }
}

// Maps raw viem/provider errors to human-readable copy. Keeps the raw
// error available in a disclosure so devs can still diagnose.
export function friendlyErrorMessage(error: Error): {
  title: string;
  message: string;
} {
  const msg = error.message.toLowerCase();

  if (
    msg.includes("max fee per gas") ||
    msg.includes("maxfeepergas") ||
    msg.includes("base fee")
  ) {
    return {
      title: "Gas price moved",
      message:
        "Network gas prices updated between the quote and signing. Try again to refresh and re-sign.",
    };
  }
  if (msg.includes("insufficient funds")) {
    return {
      title: "Not enough for gas",
      message:
        "Your wallet doesn't have enough native token to cover the network fee. Top up and try again.",
    };
  }
  if (msg.includes("nonce too low") || msg.includes("nonce has already been used")) {
    return {
      title: "Another transaction in flight",
      message:
        "Your wallet has a pending transaction on this account. Wait a moment and try again.",
    };
  }
  if (msg.includes("replacement transaction underpriced")) {
    return {
      title: "Pending transaction blocking",
      message:
        "A previous transaction from this wallet is still pending. Speed it up or cancel it in your wallet, then retry.",
    };
  }
  if (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("fetch failed") ||
    msg.includes("rpc")
  ) {
    return {
      title: "Network hiccup",
      message:
        "We couldn't reach the network. Check your connection and try again.",
    };
  }
  return {
    title: "Payment interrupted",
    message:
      "Something went wrong while preparing your transaction. Try again — this is usually transient.",
  };
}

// EIP-1193 error code 4001 = "The user rejected the request." Providers that
// honor the spec bubble this up as `error.code`. Some providers (or wrappers
// like wagmi/viem) flatten the error message without preserving the code —
// so we also match a small set of common rejection phrases as a fallback.
export function isWalletRejection(error: Error | null | undefined): boolean {
  if (!error) return false;
  const code = (error as { code?: number }).code;
  if (code === 4001) return true;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("reject") ||
    msg.includes("denied") ||
    msg.includes("declined") ||
    msg.includes("cancel")
  );
}
