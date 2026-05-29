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
import { Button } from "@dynamic-demos/ui";
import { AnimatedClockIcon, PendingStepIcon } from "./icons";

/** The action noun — any string. See PaymentWidget docs for examples. */
type WidgetMode = string;

const capitalize = (s: string) =>
  s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);

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
  const actionLabel = capitalize(mode);

  // Check if all steps are completed
  const isCompleted = steps.every((step) => step.status === "completed");
  const hasFailed = steps.some((step) => step.status === "failed");

  // Use explorer link if available
  const explorerUrl = explorerLink || null;

  return (
    <div className="flex flex-col h-full flex-1">
      <ScreenHeader
        eyebrow={mode.toUpperCase()}
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

      {/* Token Conversion Section — hidden on the completion + failure
          screens since the summary calls out the relevant info. */}
      {!isCompleted && !hasFailed && (
        <div className="px-5 py-3 border-b border-(--brand-border)">
          <TokenConversionCard
            sourceToken={sourceToken}
            destinationToken={destinationToken}
          />
        </div>
      )}

      {/* Body — completed flow renders a centered success summary; failed
          flow renders a centered failure summary (collapsing the step list
          so the error banner + retry actions get more room); in-flight
          renders the per-step progress list. */}
      {isCompleted ? (
        <div className="flex-1 min-h-[16rem] relative overflow-hidden flex flex-col items-center justify-center px-6 py-8 text-center">
          {/* Atmospheric gradient — uses the same brand vars as the token
              card so the success state feels of-a-piece with review/processing. */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-80"
            style={{
              background:
                "radial-gradient(120% 80% at 50% 0%, var(--brand-card-gradient-start), transparent 60%), radial-gradient(80% 60% at 50% 100%, var(--brand-card-gradient-end), transparent 70%)",
            }}
          />

          <div className="relative flex flex-col items-center gap-4">
            {/* Flat token avatar + check badge — no shadows, no halo. */}
            <div className="relative flex items-center justify-center animate-in fade-in zoom-in-95 duration-500 ease-out">
              <div className="w-12 h-12 rounded-full bg-(--brand-row-bg) flex items-center justify-center overflow-hidden">
                {destinationToken?.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={destinationToken.iconUrl}
                    alt={destinationToken.symbol}
                    className="w-8 h-8 rounded-full object-contain"
                  />
                ) : (
                  <Check
                    className="w-6 h-6 text-(--brand-fg)"
                    strokeWidth={2.5}
                  />
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#46B463] flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </div>
            </div>

            {/* Hero amount — tabular-nums so digits don't jitter */}
            {destinationToken && (
              <div className="flex flex-col items-center gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out delay-100">
                <div className="flex items-baseline gap-1.5 [font-variant-numeric:tabular-nums]">
                  <span className="text-[28px] font-semibold leading-none tracking-[-0.5px] text-(--brand-fg)">
                    {destinationToken.amount}
                  </span>
                  <span className="text-sm font-medium text-(--brand-muted) tracking-[0.08em] uppercase">
                    {destinationToken.symbol}
                  </span>
                </div>
                {destinationToken.usdValue && (
                  <span className="text-xs text-(--brand-muted) tracking-[-0.12px]">
                    ≈ {destinationToken.usdValue}
                  </span>
                )}
              </div>
            )}

            {/* Status caption — small, hairline divider above */}
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out delay-200">
              <span className="h-px w-6 bg-(--brand-border)" />
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-(--brand-muted)">
                {actionLabel} settled
              </span>
              <span className="h-px w-6 bg-(--brand-border)" />
            </div>
          </div>
        </div>
      ) : hasFailed ? (
        <div className="flex-1 min-h-[16rem] flex flex-col items-center justify-center gap-3 px-6 py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-500" strokeWidth={2} />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-medium text-(--brand-fg) tracking-[-0.16px]">
              {actionLabel} failed
            </h3>
            <p className="text-sm text-(--brand-muted) tracking-[-0.14px]">
              Something went wrong. You can try again or close this window.
            </p>
          </div>
        </div>
      ) : (
        <div className="px-5 py-3">
          <div className="flex flex-col">
            {steps.map((step, index) => {
              const isLast = index === steps.length - 1;
              // Line is green only if current step is completed
              const lineIsGreen = step.status === "completed";

              return (
                <div key={step.id} className="flex items-stretch gap-2.5">
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
                    className={cn("flex flex-col", !isLast && "pb-4")}
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
      )}

      {/* Error Message */}
      {error && (
        <div className="mx-5 mb-5 p-3 bg-red-50 border border-red-200 rounded-(--brand-radius) flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-800 flex-1">{error}</p>
        </div>
      )}

      {/* Footer - only show when completed or failed */}
      {(isCompleted || hasFailed) && (
        <div className="px-5 py-3 border-t border-(--brand-border)">
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
  const walletLabel = walletName || "your wallet";
  const modeLower = mode.toLowerCase();

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
    title: `Authorize ${modeLower}`,
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
    title: `Complete ${modeLower}`,
    description: `${destinationSymbol} settled`,
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

/**
 * Helper to safely update step status at index. Returns `true` if the
 * status actually changed (mutated `steps`); `false` if `steps[idx]`
 * already had the target status and no write happened. Callers use the
 * return to detect no-op updates and skip rerender churn.
 */
function setStepStatus(
  steps: TransactionStep[],
  idx: number,
  status: StepStatus,
): boolean {
  const step = steps[idx];
  if (!step || step.status === status) return false;
  steps[idx] = { ...step, status };
  return true;
}

/**
 * Mark every step as `completed`. Returns `currentSteps` unchanged
 * (same reference) when all steps are already completed — lets
 * `setSteps((prev) => updateTransactionSteps(prev, …))` short-circuit
 * the re-render via React's same-reference no-op.
 */
function markAllCompleted(currentSteps: TransactionStep[]): TransactionStep[] {
  if (currentSteps.every((s) => s.status === "completed")) return currentSteps;
  return currentSteps.map((s) => ({ ...s, status: "completed" as const }));
}

export function updateTransactionSteps(
  currentSteps: TransactionStep[],
  update: StepUpdateParams,
): TransactionStep[] {
  // Lazy clone: only allocate a new array when we actually need to
  // mutate. `setStepStatus` flips `dirty` when it writes. If no branch
  // wrote, we return `currentSteps` unchanged — React's
  // `setSteps((p) => p)` then treats this as a no-op and skips the
  // re-render. Without this, every poll tick (~30 per checkout) burned
  // a re-render of the whole TransactionProgressScreen subtree even
  // when the SDK status hadn't budged.
  const steps = [...currentSteps];
  let dirty = false;
  const set = (idx: number, status: StepStatus): void => {
    if (setStepStatus(steps, idx, status)) dirty = true;
  };

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
      if (targetIdx >= 0) set(targetIdx, "failed");
    }
    return dirty ? steps : currentSteps;
  }

  // Handle bridging status (cross-chain waiting for destination).
  //
  // When `convert` exists (sourceSymbol ≠ destinationSymbol it's the
  // active step. When it's absent (same-symbol bridge, e.g. USDC on
  // Base → USDC on Solana), promote `complete` to active instead —
  // otherwise the user sees a grey "pending" dot during the bridge
  // wait when they should be seeing a spinner.
  if (isBridging && status === "RUNNING") {
    if (authorizeIdx >= 0) set(authorizeIdx, "completed");
    if (convertIdx >= 0) {
      set(convertIdx, "active");
      if (completeIdx >= 0) set(completeIdx, "pending");
    } else if (completeIdx >= 0) {
      set(completeIdx, "active");
    }
    return dirty ? steps : currentSteps;
  }

  // Handle TOKEN_ALLOWANCE (approval) process
  if (processType === "TOKEN_ALLOWANCE") {
    if (approveIdx >= 0) {
      if (status === "ACTION_REQUIRED" || status === "RUNNING") {
        set(approveIdx, "active");
      } else if (status === "DONE") {
        set(approveIdx, "completed");
        if (authorizeIdx >= 0) set(authorizeIdx, "active");
      }
      // FAILED is handled globally at the top of the function
    } else if (authorizeIdx >= 0 && status !== "DONE") {
      // No dedicated approve step - approval is part of authorize
      set(authorizeIdx, "active");
    }
    return dirty ? steps : currentSteps;
  }

  // Handle TRANSFER (same-token same-chain) — only authorize + complete steps
  if (processType === "TRANSFER") {
    if (status === "ACTION_REQUIRED" || status === "RUNNING") {
      if (authorizeIdx >= 0) set(authorizeIdx, "active");
    } else if (status === "DONE") {
      return markAllCompleted(currentSteps);
    }
    return dirty ? steps : currentSteps;
  }

  // Handle SWAP or CROSS_CHAIN process.
  //
  // Same fall-through pattern as the bridging branch above: when
  // there's no `convert` step (same-symbol routes), promote
  // `complete` to active during the wait so the user sees a
  // spinner instead of a grey pending dot.
  if (processType === "SWAP" || processType === "CROSS_CHAIN") {
    if (status === "ACTION_REQUIRED") {
      if (authorizeIdx >= 0) set(authorizeIdx, "active");
      if (convertIdx >= 0) set(convertIdx, "pending");
    } else if (status === "RUNNING") {
      if (authorizeIdx >= 0) set(authorizeIdx, "completed");
      if (convertIdx >= 0) {
        set(convertIdx, "active");
      } else if (completeIdx >= 0) {
        set(completeIdx, "active");
      }
    } else if (status === "DONE") {
      if (isCrossChain) {
        // Cross-chain: source done, wait for bridge
        if (authorizeIdx >= 0) set(authorizeIdx, "completed");
        if (convertIdx >= 0) {
          set(convertIdx, "active");
        } else if (completeIdx >= 0) {
          set(completeIdx, "active");
        }
      } else {
        // Same-chain swap complete: mark ALL steps as completed
        return markAllCompleted(currentSteps);
      }
    }
    // FAILED is handled globally at the top of the function
    return dirty ? steps : currentSteps;
  }

  // Final completion (e.g., "RECEIVING" process or other completion signal)
  // Mark all steps as done when SDK signals full completion
  if (status === "DONE") {
    return markAllCompleted(currentSteps);
  }

  return dirty ? steps : currentSteps;
}

export type { TokenInfo };
