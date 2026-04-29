"use client";

// Auto-fires `createCheckoutTransaction` on mount — we already know the amount
// from the Cvent order.
import { createCheckoutTransaction } from "@dynamic-labs-sdk/client";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { Panel, PrimaryButton, Spinner } from "../primitives.js";
import type { CreateTransactionViewProps } from "../types.js";

export function CreateTransactionView({
  checkoutId,
  amountUsd,
  onCreated,
}: CreateTransactionViewProps) {
  const mutation = useMutation({
    mutationFn: () =>
      createCheckoutTransaction({
        amount: amountUsd,
        checkoutId,
        currency: "USD",
      }),
    onSuccess: (res) => onCreated(res.transaction),
  });

  useEffect(() => {
    if (!mutation.isIdle) return;
    mutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (mutation.error) {
    return (
      <Panel>
        <div className="rounded-2xl border border-[var(--color-pink)]/40 bg-[var(--color-pink)]/10 px-4 py-3 text-sm text-[var(--color-pink-100)]">
          {mutation.error.message}
        </div>
        <PrimaryButton onClick={() => mutation.mutate()}>Retry</PrimaryButton>
      </Panel>
    );
  }

  return (
    <Panel>
      <Spinner label="Preparing checkout…" />
    </Panel>
  );
}
