/**
 * Get Checkout Config Handler
 *
 * Returns a checkout configuration for rendering widgets.
 * This is a public handler (no auth required).
 */

import { checkoutService } from "@/lib/services";
import { NotFoundError } from "@/lib/errors";
import { parseWithSchema, checkoutIdSchema } from "@/lib/validation";
import type { StoredCheckoutConfig } from "@/lib/types/dashboard";

/**
 * Get Checkout Result
 *
 * Returns the full checkout config (excluding ownerId for security).
 * This matches StoredCheckoutConfig structure expected by widgets.
 */
type GetCheckoutResult = Omit<StoredCheckoutConfig, "ownerId">;

export async function handleGetCheckout(
  rawInput: unknown
): Promise<GetCheckoutResult> {
  const { checkoutId } = parseWithSchema(checkoutIdSchema, rawInput);

  const checkout = await checkoutService.get(checkoutId);
  if (!checkout) {
    throw new NotFoundError("Checkout not found");
  }

  // Return full checkout config (excluding ownerId for security)
  const { ownerId, ...result } = checkout;
  return result;
}
