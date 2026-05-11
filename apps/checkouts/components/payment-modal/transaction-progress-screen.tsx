"use client";

/**
 * TransactionProgressScreen
 *
 * Shows the progress of a swap/bridge transaction with dynamic steps.
 * Adapts to both "payment" and "deposit" flows.
 *
 * Steps are dynamic based on:
 * - Whether token approval is needed
 * - Whether it's a cross-chain bridge or same-chain swap
 */

import { cn } from "@dynamic-demos/utils";
import { Check, AlertCircle, ExternalLink } from "lucide-react";
import ScreenHeader from "./screen-header";
import TokenConversionCard, { type TokenInfo } from "./token-conversion-card";
import { type WidgetMode } from "@/lib/widget-config";
import { Button } from "@dynamic-demos/ui";
import {
  AnimatedClockIcon,
  PendingStepIcon,
  CashIcon,
} from "@/components/icons";

export type StepStatus = "pending" | "active" | "completed" | "failed";

export interface TransactionStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
}

interface TransactionProgressScreenProps {
  mode: WidgetMode;
  sourceToken: TokenInfo;
  destinationToken?: TokenInfo;
  steps: TransactionStep[];
  error?: string | null;
  /** Explorer link for tracking */
  explorerLink?: string;
  onClose?: () => void;
  onRetry?: () => void;
}

/**
 * Get the appropriate icon for a step based on its status
 */
function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "completed":
      return (
        <div className="w-[18px] h-[18px] flex items-center justify-center shrink-0">
          <div className="w-full h-full rounded-full bg-[#46B463] flex items-center justify-center">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        </div>
      );
    case "active":
      return (
        <div className="w-[18px] h-[18px] flex items-center justify-center shrink-0">
          <AnimatedClockIcon />
        </div>
      );
    case "failed":
      return (
        <div className="w-[18px] h-[18px] flex items-center justify-center shrink-0">
          <AlertCircle className="w-full h-full text-red-500" />
        </div>
      );
    case "pending":
    default:
      return (
        <div className="w-[18px] h-[18px] flex items-center justify-center shrink-0">
          <PendingStepIcon />
        </div>
      );
  }
}

export default function TransactionProgressScreen({
  mode,
  sourceToken,
  destinationToken,
  steps,
  error,
  explorerLink,
  onClose,
  onRetry,
}: TransactionProgressScreenProps) {
  const actionLabel = mode === "deposit" ? "Deposit" : "Payment";

  // Check if all steps are completed
  const isCompleted = steps.every((step) => step.status === "completed");
  const hasFailed = steps.some((step) => step.status === "failed");

  // Use explorer link if available
  const explorerUrl = explorerLink || null;

  return (
    <div className="flex flex-col">
      <ScreenHeader
        icon={<CashIcon size={18} className="text-(--brand-fg)" />}
        title={
          isCompleted
            ? `${actionLabel} Complete`
            : hasFailed
              ? `${actionLabel} Failed`
              : `Processing ${actionLabel}`
        }
        onClose={isCompleted || hasFailed ? onClose : undefined}
        showClosePlaceholder={!(isCompleted || hasFailed)}
      />

      {/* Token Conversion Section */}
      <div className="p-3">
        <TokenConversionCard
          sourceToken={sourceToken}
          destinationToken={destinationToken}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-(--brand-border)" />

      {/* Progress Steps */}
      <div className="p-3">
        <div className="border border-(--brand-border) rounded-(--brand-radius) p-3">
          <div className="flex flex-col">
            {steps.map((step, index) => {
              const isLast = index === steps.length - 1;
              // Line is green only if current step is completed
              const lineIsGreen = step.status === "completed";

              return (
                <div key={step.id} className="flex items-stretch gap-3">
                  {/* Icon column with connecting line */}
                  <div className="flex flex-col items-center">
                    <div className="pt-0.5">
                      <StepIcon status={step.status} />
                    </div>
                    {/* Connecting line to next step */}
                    {!isLast && (
                      <div
                        className={cn(
                          "w-0.5 flex-1 my-1 min-h-[16px] rounded-full",
                          lineIsGreen ? "bg-[#46B463]" : "bg-(--brand-border)",
                        )}
                      />
                    )}
                  </div>
                  {/* Content */}
                  <div
                    className={cn("flex flex-col gap-0.5", !isLast && "pb-4")}
                  >
                    <span className="text-sm font-medium tracking-[-0.14px] leading-5 text-(--brand-fg)">
                      {step.title}
                    </span>
                    <span className="text-xs text-(--brand-muted) tracking-[-0.12px] leading-4">
                      {step.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-3 mb-3 p-3 bg-red-50 border border-red-200 rounded-(--brand-radius) flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-800 flex-1">{error}</p>
        </div>
      )}

      {/* Footer - only show when completed or failed */}
      {(isCompleted || hasFailed) && (
        <div className="p-3 border-t border-(--brand-border)">
          {hasFailed && onRetry ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button onClick={onRetry} className="flex-1">
                Try Again
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {explorerUrl && (
                <Button
                  variant="secondary"
                  onClick={() => window.open(explorerUrl, "_blank")}
                  className="flex-1 gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Tx
                </Button>
              )}
              <Button onClick={onClose} className="flex-1">
                Done
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Helper to generate transaction steps based on requirements
 */
export function generateTransactionSteps(
  mode: WidgetMode,
  needsApproval: boolean,
  sourceSymbol: string,
  destinationSymbol: string,
  walletName?: string,
): TransactionStep[] {
  const isDeposit = mode === "deposit";
  const walletLabel = walletName || "your wallet";

  const steps: TransactionStep[] = [];

  if (needsApproval) {
    steps.push({
      id: "approve",
      title: "Approve token",
      description: `Allow ${sourceSymbol} spending in ${walletLabel}`,
      status: "pending",
    });
  }

  steps.push({
    id: "authorize",
    title: isDeposit ? "Authorize deposit" : "Authorize payment",
    description: `Confirm in ${walletLabel}`,
    status: "pending",
  });

  if (sourceSymbol !== destinationSymbol) {
    steps.push({
      id: "convert",
      title: `Converting to ${destinationSymbol}`,
      description: `Your ${sourceSymbol} is swapped to ${destinationSymbol}`,
      status: "pending",
    });
  }

  steps.push({
    id: "complete",
    title: isDeposit ? "Complete deposit" : "Complete purchase",
    description: isDeposit
      ? `${destinationSymbol} is added to your account`
      : `Merchant receives ${destinationSymbol}`,
    status: "pending",
  });

  return steps;
}

/**
 * Update transaction steps based on LI.FI execution updates.
 * This is a pure function that returns new steps array.
 */
export interface StepUpdateParams {
  processType?: string;
  status: "PENDING" | "ACTION_REQUIRED" | "RUNNING" | "DONE" | "FAILED";
  isBridging?: boolean;
  isCrossChain?: boolean;
  stepIndex?: number;
  totalSteps?: number;
}

/** Helper to safely update step status at index (type-safe) */
function setStepStatus(
  steps: TransactionStep[],
  idx: number,
  status: StepStatus,
): void {
  const step = steps[idx];
  if (step) {
    steps[idx] = { ...step, status };
  }
}

export function updateTransactionSteps(
  currentSteps: TransactionStep[],
  update: StepUpdateParams,
): TransactionStep[] {
  const steps = [...currentSteps];

  // Find step indices
  const authorizeIdx = steps.findIndex((s) => s.id === "authorize");
  const approveIdx = steps.findIndex((s) => s.id === "approve");
  const convertIdx = steps.findIndex((s) => s.id === "convert");
  const completeIdx = steps.findIndex((s) => s.id === "complete");

  const { processType, status, isBridging, isCrossChain } = update;

  // Handle FAILED status - only mark ONE step as failed (ignore if already have a failed step)
  if (status === "FAILED") {
    const alreadyHasFailed = steps.some((s) => s.status === "failed");
    if (!alreadyHasFailed) {
      const activeIdx = steps.findIndex((s) => s.status === "active");
      const targetIdx =
        activeIdx >= 0
          ? activeIdx
          : steps.findIndex((s) => s.status === "pending");
      if (targetIdx >= 0) {
        setStepStatus(steps, targetIdx, "failed");
      }
    }
    return steps;
  }

  // Handle bridging status (cross-chain waiting for destination)
  if (isBridging && status === "RUNNING") {
    if (authorizeIdx >= 0) setStepStatus(steps, authorizeIdx, "completed");
    if (convertIdx >= 0) setStepStatus(steps, convertIdx, "active");
    if (completeIdx >= 0) setStepStatus(steps, completeIdx, "pending");
    return steps;
  }

  // Handle TOKEN_ALLOWANCE (approval) process
  if (processType === "TOKEN_ALLOWANCE") {
    if (approveIdx >= 0) {
      if (status === "ACTION_REQUIRED" || status === "RUNNING") {
        setStepStatus(steps, approveIdx, "active");
      } else if (status === "DONE") {
        setStepStatus(steps, approveIdx, "completed");
        if (authorizeIdx >= 0) setStepStatus(steps, authorizeIdx, "active");
      }
      // FAILED is handled globally at the top of the function
    } else if (authorizeIdx >= 0 && status !== "DONE") {
      // No dedicated approve step - approval is part of authorize
      setStepStatus(steps, authorizeIdx, "active");
    }
    return steps;
  }

  // Handle SWAP or CROSS_CHAIN process
  if (processType === "SWAP" || processType === "CROSS_CHAIN") {
    if (status === "ACTION_REQUIRED") {
      if (authorizeIdx >= 0) setStepStatus(steps, authorizeIdx, "active");
      if (convertIdx >= 0) setStepStatus(steps, convertIdx, "pending");
    } else if (status === "RUNNING") {
      if (authorizeIdx >= 0) setStepStatus(steps, authorizeIdx, "completed");
      if (convertIdx >= 0) setStepStatus(steps, convertIdx, "active");
    } else if (status === "DONE") {
      if (isCrossChain) {
        // Cross-chain: source done, wait for bridge
        if (authorizeIdx >= 0) setStepStatus(steps, authorizeIdx, "completed");
        if (convertIdx >= 0) setStepStatus(steps, convertIdx, "active");
      } else {
        // Same-chain swap complete: mark ALL steps as completed
        return steps.map((s) => ({ ...s, status: "completed" as const }));
      }
    }
    // FAILED is handled globally at the top of the function
    return steps;
  }

  // Final completion (e.g., "RECEIVING" process or other completion signal)
  // Mark all steps as done when SDK signals full completion
  if (status === "DONE") {
    return steps.map((s) => ({ ...s, status: "completed" as const }));
  }

  return steps;
}

export type { TokenInfo };
