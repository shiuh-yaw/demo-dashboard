"use server";

import { createCheckout } from "@/lib/dynamic/server";
import { lockRate } from "@/lib/fx/rate";
import { computeAmountDueUsd } from "@/lib/fx/compute";
import {
  readByConfirmation,
  transition,
  updateFx,
  withLock,
} from "@/lib/store/order-store";
import { env } from "@/lib/env";
import type { OrderState } from "@/lib/types/order-state";
import { assertSafeConfirmation } from "@/lib/validation";

const RETRYABLE = ["awaiting_payment", "checkout_expired", "tx_failed"] as const;

export async function createCheckoutAction(
  confirmation: string
): Promise<{ checkoutId: string; orderState: OrderState }> {
  const safeConfirmation = assertSafeConfirmation(confirmation);
  return withLock(safeConfirmation, async () => {
    const current = await readByConfirmation(safeConfirmation);
    if (!current) throw new Error(`Order ${safeConfirmation} not found`);

    if (current.status === "checkout_ready" && current.dynamicCheckoutId) {
      return { checkoutId: current.dynamicCheckoutId, orderState: current };
    }

    if (!(RETRYABLE as readonly string[]).includes(current.status)) {
      throw new Error(`Cannot create checkout from status ${current.status}`);
    }

    // Re-lock FX only on explicit retry paths (expired / tx_failed) OR when a
    // prior resolver lock didn't happen (e.g. Coinbase was down during page
    // render). On a plain awaiting_payment entry with FX already populated,
    // reuse the locked rate — the resolver got there first.
    const needsLock =
      !current.fxSource ||
      current.status === "checkout_expired" ||
      current.status === "tx_failed";

    if (needsLock) {
      const locked = await lockRate(current.currency);
      const amountDueUsd = computeAmountDueUsd(current.amountDue, locked.rate);
      await updateFx(safeConfirmation, {
        amountDueUsd,
        fxRate: locked.rate.toFixed(4),
        fxSource: locked.source,
        fxLockedAt: locked.fetchedAt,
      });
    }

    const { checkoutId } = await createCheckout({
      destinationAddress: env.SPARK26_DESTINATION_ADDRESS,
    });
    const orderState = await transition(
      safeConfirmation,
      [...RETRYABLE],
      "checkout_ready",
      { dynamicCheckoutId: checkoutId }
    );
    return { checkoutId, orderState };
  });
}
