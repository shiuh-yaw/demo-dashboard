"use server";

import { readOrReseed } from "@/lib/resolve-order-state";
import { transition } from "@/lib/store/order-store";
import type { OrderState } from "@/lib/types/order-state";
import {
  assertSafeConfirmation,
  assertSafeTransactionId,
} from "@/lib/validation";

export async function markInFlightAction(
  confirmation: string,
  dynamicTransactionId: string
): Promise<OrderState> {
  const safeConfirmation = assertSafeConfirmation(confirmation);
  const safeTxId = assertSafeTransactionId(dynamicTransactionId);
  const current = await readOrReseed(safeConfirmation);
  if (!current) throw new Error(`Order ${safeConfirmation} not found`);
  if (!current.dynamicCheckoutId) {
    // Either the order was never advanced past awaiting_payment (caller
    // skipped createCheckoutAction) OR the Redis record was wiped mid-flow
    // and re-seeded without a checkoutId. We can't attach the tx to a
    // Dynamic checkout we don't know about — bail with a message that
    // tells the user to start over.
    throw new Error(
      `Order ${safeConfirmation} has no active checkout — your payment session was lost. Please refresh the page to start a fresh one.`
    );
  }
  return transition(safeConfirmation, ["checkout_ready"], "tx_in_flight", {
    dynamicTransactionId: safeTxId,
  });
}
