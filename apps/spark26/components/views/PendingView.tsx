"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Shell } from "../ui/Shell.js";
import { SparkBolt } from "../ui/SparkBolt.js";
import { explorerLink } from "@/lib/format.js";
import type { OrderState } from "@/lib/types/order-state";

type StatusResponse = {
  status: OrderState["status"];
  amountDue: string;
  currency: string;
  attendeeName?: string;
  updatedAt: string;
};

const TERMINAL_STATES = new Set([
  "paid",
  "tx_confirmed", // UI-terminal: page router re-renders as ConfirmationView
  "cancelled",
  "tx_failed",
  "checkout_expired",
]);
const THIRTY_MIN_MS = 30 * 60 * 1000;

export function PendingView({
  state,
  confirmation,
}: {
  state: OrderState;
  confirmation: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery<StatusResponse>({
    queryKey: ["status", confirmation],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${confirmation}/status`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      return res.json();
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && TERMINAL_STATES.has(status)) return false;
      return 3_000;
    },
    initialData: {
      status: state.status,
      amountDue: state.amountDue,
      currency: state.currency,
      attendeeName: state.attendeeName,
      updatedAt: state.updatedAt,
    },
  });

  useEffect(() => {
    const status = data?.status;
    if (!status) return;
    if (TERMINAL_STATES.has(status) || status !== state.status) {
      queryClient.invalidateQueries({ queryKey: ["status", confirmation] });
      router.refresh();
    }
  }, [data?.status, state.status, router, queryClient, confirmation]);

  const startedAt = Date.parse(state.updatedAt);
  const tooLong = Date.now() - startedAt > THIRTY_MIN_MS;

  const statusCopy = "Confirming your payment onchain. Keep this page open.";

  const txLink = explorerLink(state.txHash);

  const stuckRef =
    `spark26:${confirmation}` +
    (state.txHash ? `:${state.txHash}` : state.dynamicTransactionId ? `:${state.dynamicTransactionId}` : "");

  return (
    <Shell>
      <section className="card">
        <div className="flex items-center gap-4">
          <div
            className="h-10 w-10 rounded-full border border-[var(--color-navy-line)] flex items-center justify-center shrink-0 text-[var(--color-blue)]"
            aria-hidden
          >
            <SparkBolt size={22} animated />
          </div>
          <h1 className="text-[26px] sm:text-[30px]">Payment in progress.</h1>
        </div>

        <p className="mt-5 text-[15px] text-[color-mix(in_srgb,var(--color-blue-100)_75%,transparent)]">
          {statusCopy}
        </p>

        {txLink && (
          <a
            href={txLink}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-sm font-mono text-[var(--color-blue-100)] hover:text-white underline-offset-4 hover:underline"
          >
            View transaction <span aria-hidden>↗</span>
          </a>
        )}

        {tooLong && (
          <div className="mt-6 rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/8 px-4 py-3 text-sm text-[var(--color-gold-100)]">
            Taking longer than expected. Your payment may still complete — contact{" "}
            <a
              className="underline underline-offset-4"
              href="mailto:spark26@fireblocks.com"
            >
              spark26@fireblocks.com
            </a>{" "}
            with reference{" "}
            <code className="font-mono text-xs">{stuckRef}</code>.
          </div>
        )}
      </section>
    </Shell>
  );
}
