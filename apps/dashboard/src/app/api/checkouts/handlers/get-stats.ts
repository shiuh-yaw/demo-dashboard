/**
 * Get Checkout Stats Handler
 *
 * Returns aggregated statistics for a checkout.
 */

import { services, checkoutService } from "@/lib/services";
import { NotFoundError } from "@/lib/errors";
import {
  getStatsSchema,
  parseWithSchema,
  type GetStatsInput,
} from "@/lib/validation";
import type { Stats } from "@/lib/types/dashboard";

export async function handleGetStats(
  rawInput: unknown
): Promise<{ stats: Stats }> {
  const { checkoutId } = parseWithSchema(getStatsSchema, rawInput);

  // Verify checkout exists. Existence check goes through Postgres via
  // `services.demoConfigs` (see `get-checkout.ts` for context); the
  // `getStats` call stays on Redis — transaction stats live there
  // independently of config storage.
  const record = await services.demoConfigs.get(checkoutId);
  if (!record || record.kind !== "checkout") {
    throw new NotFoundError("Checkout not found");
  }

  const stats = await checkoutService.getStats(checkoutId);

  return { stats };
}

// Re-export types for route usage
export type { GetStatsInput };
