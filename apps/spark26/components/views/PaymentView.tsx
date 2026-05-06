"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Shell } from "../ui/Shell.js";
import { CheckoutShell } from "../dynamic-checkout/CheckoutShell.js";
import type { OrderState } from "@/lib/types/order-state";
import { formatCurrency } from "@/lib/format";
import { createCheckoutAction } from "@/app/actions/create-checkout.js";
import { markInFlightAction } from "@/app/actions/mark-in-flight.js";
import { confirmPaymentAction } from "@/app/actions/confirm-payment.js";

const NEEDS_NEW_CHECKOUT: OrderState["status"][] = [
  "awaiting_payment",
  "checkout_expired",
  "tx_failed",
];

export function PaymentView({
  state,
  confirmation,
}: {
  state: OrderState;
  confirmation: string;
}) {
  const router = useRouter();
  const [checkoutId, setCheckoutId] = useState<string | null>(
    state.dynamicCheckoutId ?? null
  );
  const [banner, setBanner] = useState<string | null>(
    state.status === "tx_failed"
      ? "Previous attempt failed — try again."
      : null
  );

  const createMutation = useMutation({
    mutationFn: () => createCheckoutAction(confirmation),
    onSuccess: (res) => setCheckoutId(res.checkoutId),
    onError: (err: Error) => setBanner(`Couldn't start payment: ${err.message}`),
  });

  const markMutation = useMutation({
    mutationFn: (txId: string) => markInFlightAction(confirmation, txId),
    // Intentionally NO router.refresh() here. If we refreshed, the RSC resolver
    // would see state = tx_in_flight, route to PendingView, unmount CheckoutShell,
    // and strand the StatusView that's polling Dynamic for completion — nothing
    // would ever call confirmPaymentAction. Stay in PaymentView until the
    // CheckoutShell's status poller fires onTransactionCompleted → confirmMutation.
    onError: (err: Error) => setBanner(`Couldn't attach transaction: ${err.message}`),
  });

  const confirmMutation = useMutation({
    mutationFn: (args: {
      dynamicTransactionId: string;
      txHash: string;
      sourceChain?: string;
      sourceAsset?: string;
      sourceAssetLogo?: string;
    }) => confirmPaymentAction(confirmation, args),
    onSuccess: () => router.refresh(),
    onError: (err: Error) => setBanner(`Couldn't finalize payment: ${err.message}`),
  });

  // Ref guard so React's StrictMode double-mount in dev doesn't fire the
  // mutation twice. The server action is idempotent for checkout_ready as a
  // belt-and-suspenders measure, but this avoids an extra round-trip entirely.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!checkoutId && NEEDS_NEW_CHECKOUT.includes(state.status)) {
      autoStartedRef.current = true;
      createMutation.mutate();
    }
  }, [checkoutId, state.status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Shell>
      <section className="card">
        <p className="label mb-5">Amount due</p>
        <div className="display-amount text-white">
          {formatCurrency(state.amountDue, state.currency)}
        </div>
        {state.fxSource && state.fxSource !== "identity" && state.amountDueUsd && state.fxRate && (
          <p className="mt-2 text-[17px] font-medium text-[color-mix(in_srgb,var(--color-blue-100)_85%,transparent)]">
            ≈ {formatCurrency(state.amountDueUsd, "USD")} USD
            <span className="ml-2 text-[13px] font-normal text-[color-mix(in_srgb,var(--color-blue-100)_55%,transparent)]">
              @ {state.fxRate}
            </span>
          </p>
        )}
        {state.attendeeName && (
          <p className="mt-4 text-[15px] text-[color-mix(in_srgb,var(--color-blue-100)_75%,transparent)]">
            {state.attendeeName}
          </p>
        )}
      </section>

      {banner && (
        <div
          role="status"
          className="rounded-2xl border border-[var(--color-pink)]/35 bg-[var(--color-pink)]/10 px-5 py-4 text-sm text-[var(--color-pink-100)]"
        >
          {banner}
        </div>
      )}

      {checkoutId ? (
        <CheckoutShell
          checkoutId={checkoutId}
          amountUsd={state.amountDueUsd ?? state.amountDue}
          onTransactionSubmitted={async (txId) => {
            await markMutation.mutateAsync(txId);
          }}
          onTransactionCompleted={async (args) => {
            await confirmMutation.mutateAsync(args);
          }}
        />
      ) : (
        <div className="card flex items-center justify-between gap-4">
          <p className="text-sm text-[color-mix(in_srgb,var(--color-blue-100)_75%,transparent)]">
            {createMutation.isPending
              ? "Preparing your payment…"
              : "Ready when you are."}
          </p>
          {!createMutation.isPending && (
            <button
              className="cursor-pointer rounded-xl px-5 py-2.5 text-sm font-semibold bg-[var(--color-blue-400)] text-white hover:bg-[var(--color-blue)] transition-colors"
              onClick={() => createMutation.mutate()}
            >
              Start
            </button>
          )}
        </div>
      )}
    </Shell>
  );
}
