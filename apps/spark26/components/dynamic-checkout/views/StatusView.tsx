"use client";

// Polls `getCheckoutTransaction` until it reaches a terminal execution or
// settlement state. Surfaces pipeline progress (Broadcast → Confirm → Settle)
// using Dynamic's executionState/settlementState so the user knows what the
// system is actually doing while they wait.
import { getCheckoutTransaction } from "@dynamic-labs-sdk/client";
import type {
  CheckoutExecutionState,
  CheckoutSettlementState,
} from "@dynamic-labs-sdk/client";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useEffect } from "react";
import { Panel } from "../primitives.js";
import type { StatusViewProps } from "../types.js";
import { SparkBolt } from "@/components/ui/SparkBolt.js";

const TERMINAL_EXECUTION_STATES: CheckoutExecutionState[] = [
  "cancelled",
  "expired",
  "failed",
];

const TERMINAL_SETTLEMENT_STATES: CheckoutSettlementState[] = [
  "completed",
  "failed",
];

const SETTLING_STATES: CheckoutSettlementState[] = [
  "routing",
  "swapping",
  "bridging",
  "settling",
];

export function StatusView({
  transactionId,
  onCompleted,
  onFailed,
}: StatusViewProps) {
  const { data: tx, error } = useQuery({
    queryKey: ["checkoutTx", transactionId],
    queryFn: () => getCheckoutTransaction({ transactionId }),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 3000;
      const execState = data.executionState as CheckoutExecutionState;
      const settleState = data.settlementState as CheckoutSettlementState;
      if (
        TERMINAL_EXECUTION_STATES.includes(execState) ||
        TERMINAL_SETTLEMENT_STATES.includes(settleState)
      ) {
        return false;
      }
      return 3000;
    },
  });

  useEffect(() => {
    if (!tx) return;
    const execState = tx.executionState as CheckoutExecutionState;
    const settleState = tx.settlementState as CheckoutSettlementState;
    if (settleState === "completed" && tx.completedAt) {
      onCompleted(tx);
    } else if (
      execState === "failed" ||
      execState === "cancelled" ||
      execState === "expired" ||
      settleState === "failed"
    ) {
      onFailed(tx, `${execState}/${settleState}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx?.executionState, tx?.settlementState, tx?.completedAt]);

  const stages = computePipeline(
    tx?.executionState as CheckoutExecutionState | undefined,
    tx?.settlementState as CheckoutSettlementState | undefined,
  );

  const settleSubstate = tx?.settlementState as CheckoutSettlementState | undefined;
  const settleHint = SETTLING_STATES.includes(settleSubstate as CheckoutSettlementState)
    ? String(settleSubstate).charAt(0).toUpperCase() + String(settleSubstate).slice(1) + "…"
    : undefined;

  return (
    <Panel step={4}>
      <div>
        <h2 className="text-[22px] mb-1">Finalizing</h2>
        <p className="text-sm text-[color-mix(in_srgb,var(--color-blue-100)_70%,transparent)]">
          Keep this page open. We'll update as the payment settles.
        </p>
      </div>

      <ol className="space-y-4">
        <PipelineRow label="Broadcast" state={stages.broadcast} />
        <PipelineRow label="Source confirmed" state={stages.confirm} />
        <PipelineRow
          label="Settle on Base"
          state={stages.settle}
          hint={stages.settle === "active" ? settleHint : undefined}
        />
      </ol>

      {error && (
        <div className="rounded-2xl border border-[var(--color-pink)]/40 bg-[var(--color-pink)]/10 px-4 py-3 text-sm text-[var(--color-pink-100)]">
          {error.message}
        </div>
      )}
    </Panel>
  );
}

type StageState = "pending" | "active" | "done";

type Pipeline = {
  broadcast: StageState;
  confirm: StageState;
  settle: StageState;
};

function computePipeline(
  exec: CheckoutExecutionState | undefined,
  settle: CheckoutSettlementState | undefined,
): Pipeline {
  const broadcastDone =
    exec === "source_confirmed" ||
    settle === "completed" ||
    SETTLING_STATES.includes(settle as CheckoutSettlementState);
  const confirmDone =
    settle === "completed" ||
    SETTLING_STATES.includes(settle as CheckoutSettlementState);
  const settleDone = settle === "completed";

  return {
    broadcast: broadcastDone ? "done" : "active",
    confirm: broadcastDone ? (confirmDone ? "done" : "active") : "pending",
    settle: confirmDone ? (settleDone ? "done" : "active") : "pending",
  };
}

function PipelineRow({
  label,
  state,
  hint,
}: {
  label: string;
  state: StageState;
  hint?: string;
}) {
  return (
    <li className="flex items-center gap-3">
      <StageIndicator state={state} />
      <div className="flex-1 min-w-0">
        <p
          className={
            state === "pending"
              ? "text-[15px] leading-tight text-[color-mix(in_srgb,var(--color-blue-100)_55%,transparent)]"
              : "text-[15px] leading-tight font-semibold text-white"
          }
        >
          {label}
        </p>
        {hint && (
          <p className="text-xs text-[color-mix(in_srgb,var(--color-blue-100)_55%,transparent)] mt-0.5">
            {hint}
          </p>
        )}
      </div>
    </li>
  );
}

function StageIndicator({ state }: { state: StageState }) {
  if (state === "active") {
    return (
      <div className="h-7 w-7 shrink-0 flex items-center justify-center text-[var(--color-blue)]">
        <SparkBolt size={22} animated />
      </div>
    );
  }
  if (state === "done") {
    return (
      <div
        className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-[var(--color-navy)]"
        style={{ background: "var(--color-blue)" }}
      >
        <Check size={14} strokeWidth={2.5} />
      </div>
    );
  }
  return (
    <div className="h-7 w-7 rounded-full border border-[var(--color-navy-line)] shrink-0" />
  );
}
