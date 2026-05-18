/**
 * Get Checkout Config Handler
 *
 * Returns a checkout configuration for rendering widgets.
 * This is a public handler (no auth required).
 *
 * Reads through `services.demoConfigs` so the public widget reader hits
 * the same store the write path uses (`actions/checkouts.ts`). Until this
 * was unified, `checkoutService` was hardcoded to Redis while
 * `USE_POSTGRES_DEMO_CONFIGS=true` routed writes to Postgres — every
 * record created after the Phase 2 cutover (PR #64, May 12 2026) was
 * invisible to the public widget and returned 404.
 */

import { services } from "@/lib/services";
import { checkoutMapper } from "@/lib/services/demo-config-mappers/checkout";
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

  const record = await services.demoConfigs.get(checkoutId);
  if (!record || record.kind !== "checkout") {
    throw new NotFoundError("Checkout not found");
  }
  const brand = record.brandId
    ? await services.brands.get(record.brandId)
    : null;
  const stored = checkoutMapper.toStored(record, brand);

  const { ownerId, ...result } = stored;
  return result;
}
