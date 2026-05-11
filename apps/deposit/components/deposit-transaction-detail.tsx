"use client";

import { AlertCircle, Check, RefreshCw } from "lucide-react";
import { widgetHeaderTrailingIconButtonClassName } from "@dynamic-demos/ui";
import { DEPOSIT_ASSETS, getBaseTxExplorerUrl } from "@/lib/assets";
import type { DepositItem } from "@/lib/deposit-status-types";

type StepUi = "done" | "current" | "upcoming" | "error";

type ComplianceOutcome = "pending" | "ok" | "error";

const PROGRESS_STEPS: { title: string; baseDetail: string }[] = [
  {
    title: "On-chain confirmation",
    baseDetail: "Fireblocks is confirming the deposit transaction on Base.",
  },
  {
    title: "Compliance checks",
    baseDetail: "AML and travel-rule screening on the incoming transfer.",
  },
  {
    title: "Vault credited",
    baseDetail:
      "Funds are in your deposit vault and payout to your embedded wallet is being prepared.",
  },
  {
    title: "Payout in progress",
    baseDetail: `${DEPOSIT_ASSETS.USDC.symbol} is being sent to your embedded wallet address.`,
  },
  {
    title: "Delivered",
    baseDetail: "The transfer to your wallet has completed.",
  },
];

/** Derive outcome from raw Fireblocks screening verdict + status fields. */
function complianceVerdictFromFields(
  verdict: string | undefined,
  status: string | undefined,
): ComplianceOutcome | null {
  const v = (verdict ?? "").toUpperCase();
  const s = (status ?? "").toUpperCase();
  if (v === "REJECT" || s === "BLOCKED" || s === "FAILED") return "error";
  if (v === "ACCEPT" || s === "BYPASSED") return "ok";
  return null;
}

/** Fallback when Fireblocks omits screening fields — infer from deposit status. */
function complianceFallbackFromStatus(
  depositStatus: DepositItem["status"],
): ComplianceOutcome {
  if (depositStatus === "received") return "pending";
  if (depositStatus === "screening_failed") return "error";
  if (
    depositStatus === "screening" ||
    depositStatus === "transferring" ||
    depositStatus === "complete"
  ) {
    return "ok";
  }
  return "pending";
}

function amlComplianceOutcome(deposit: DepositItem): ComplianceOutcome {
  const aml = deposit.amlScreening;
  if (aml) {
    return (
      complianceVerdictFromFields(aml.verdict, aml.screeningStatus) ?? "pending"
    );
  }
  return complianceFallbackFromStatus(deposit.status);
}

function travelRuleComplianceOutcome(deposit: DepositItem): ComplianceOutcome {
  const tr = deposit.travelRuleScreening;
  if (tr) {
    return complianceVerdictFromFields(tr.verdict, tr.status) ?? "pending";
  }
  if (deposit.status === "received") return "pending";
  if (amlComplianceOutcome(deposit) !== "ok") return "pending";
  if (deposit.status === "screening_failed") {
    return amlComplianceOutcome(deposit) === "ok" ? "error" : "pending";
  }
  return complianceFallbackFromStatus(deposit.status);
}

function progressStepState(deposit: DepositItem, stepIndex: number): StepUi {
  /** Listed deposits are already in Fireblocks; on-chain step is satisfied. */
  const aml = amlComplianceOutcome(deposit);
  const tr = travelRuleComplianceOutcome(deposit);
  const complianceDone = aml === "ok" && tr === "ok";
  const complianceError = aml === "error" || tr === "error";

  if (stepIndex === 0) {
    return "done";
  }

  if (stepIndex === 1) {
    if (complianceError) return "error";
    if (complianceDone) return "done";
    return "current";
  }

  if (stepIndex === 2) {
    if (!complianceDone) return "upcoming";
    if (deposit.status === "screening_failed") return "error";
    if (deposit.status === "transferring" || deposit.status === "complete")
      return "done";
    if (deposit.status === "screening") return "current";
    return "upcoming";
  }

  if (stepIndex === 3) {
    if (deposit.status === "complete") return "done";
    if (deposit.status === "transferring") return "current";
    return "upcoming";
  }

  if (stepIndex === 4) {
    return deposit.status === "complete" ? "done" : "upcoming";
  }

  return "upcoming";
}

function formatTime(createdAt: number): string {
  try {
    return new Date(createdAt).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function shortTxHash(hash: string): string {
  const t = hash.trim();
  if (t.length <= 12) return t;
  return `${t.slice(0, 10)}…`;
}

function stepTitleClass(state: StepUi): string {
  if (state === "error") return "text-(--brand-error)";
  if (state === "upcoming") return "text-(--brand-muted)";
  return "text-(--brand-fg)";
}

function stepBadgeClass(state: StepUi): string {
  const base =
    "flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[10px] font-medium transition-colors";
  if (state === "done") {
    return `${base} border-(--brand-success) bg-(--brand-success) text-white`;
  }
  if (state === "current") {
    return `${base} border-(--brand-accent) bg-(--brand-accent)/[0.08] text-(--brand-accent)`;
  }
  if (state === "error") {
    return `${base} border-(--brand-error) bg-(--brand-error) text-white`;
  }
  return `${base} border-(--brand-border) bg-(--brand-row-bg) text-(--brand-muted) opacity-80`;
}

function stepDescription(
  deposit: DepositItem,
  stepIndex: number,
  state: StepUi,
  baseDetail: string,
): string {
  if (stepIndex === 0 && state === "done") {
    return "The deposit is on-chain and visible to Fireblocks.";
  }
  if (state === "error" && deposit.status === "screening_failed") {
    if (stepIndex === 1) {
      return "This deposit did not pass compliance screening and is under review.";
    }
  }
  return baseDetail;
}

interface DepositTransactionDetailProps {
  deposit: DepositItem;
  network: "base" | "base-sepolia";
  /** Refetch deposit status (e.g. parent React Query). */
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function DepositTransactionDetail({
  deposit,
  network,
  onRefresh,
  isRefreshing = false,
}: DepositTransactionDetailProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="space-y-1 rounded-(--brand-radius) border border-(--brand-border) bg-(--brand-row-bg)/50 px-3 py-2 text-xs text-(--brand-muted)">
        <div className="flex justify-between gap-3">
          <span className="shrink-0">Amount</span>
          <span className="font-semibold tabular-nums text-(--brand-fg) text-right">
            {deposit.amount} {DEPOSIT_ASSETS.USDC.symbol}
          </span>
        </div>
        {deposit.createdAt ? (
          <div className="flex justify-between gap-3">
            <span className="shrink-0">Started</span>
            <span className="text-right">{formatTime(deposit.createdAt)}</span>
          </div>
        ) : null}
        {deposit.txHash ? (
          <div className="flex justify-between gap-3 min-w-0">
            <span className="shrink-0">Deposit tx</span>
            <a
              href={getBaseTxExplorerUrl(network, deposit.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 font-mono truncate text-right underline-offset-2 hover:text-(--brand-accent) hover:underline"
            >
              {shortTxHash(deposit.txHash)}
            </a>
          </div>
        ) : null}
        {deposit.outgoingTxId ? (
          <div className="flex justify-between gap-3 min-w-0">
            <span className="shrink-0">Forward tx</span>
            {deposit.forwardTxHash ? (
              <a
                href={getBaseTxExplorerUrl(network, deposit.forwardTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 font-mono truncate text-right underline-offset-2 hover:text-(--brand-accent) hover:underline"
              >
                {shortTxHash(deposit.forwardTxHash)}
              </a>
            ) : (
              <span
                className="text-right opacity-80"
                title="On-chain hash not available yet"
              >
                Confirming…
              </span>
            )}
          </div>
        ) : null}
        {deposit.outgoingTxId ? (
          <div className="flex justify-between gap-3 min-w-0">
            <span className="shrink-0">Payout ID</span>
            <span
              className="min-w-0 font-mono truncate text-right"
              title={deposit.outgoingTxId}
            >
              {deposit.outgoingTxId.slice(0, 8)}…
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3
            id="deposit-progress-heading"
            className="m-0 min-w-0 truncate text-xs font-medium text-(--brand-muted)"
          >
            Progress
          </h3>
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`${widgetHeaderTrailingIconButtonClassName} disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50`}
              aria-label="Refresh progress"
              title="Refresh"
            >
              <RefreshCw
                className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
                strokeWidth={2}
                aria-hidden
              />
            </button>
          ) : null}
        </div>
        <ol
          className="m-0 list-none space-y-2.5 p-0"
          aria-labelledby="deposit-progress-heading"
        >
          {PROGRESS_STEPS.map((step, i) => {
            const state = progressStepState(deposit, i);
            const description = stepDescription(
              deposit,
              i,
              state,
              step.baseDetail,
            );
            return (
              <li
                key={step.title}
                className="flex gap-3 items-start"
                aria-current={state === "current" ? "step" : undefined}
              >
                <div className="flex shrink-0 pt-0.5">
                  <span className={stepBadgeClass(state)}>
                    {state === "done" ? (
                      <Check
                        className="size-3.5"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    ) : state === "error" ? (
                      <AlertCircle
                        className="size-3.5"
                        strokeWidth={2}
                        aria-hidden
                      />
                    ) : (
                      <span className="tabular-nums">{i + 1}</span>
                    )}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold leading-snug ${stepTitleClass(state)}`}
                  >
                    {step.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-(--brand-muted)">
                    {description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
