/**
 * Get Checkout Stats Handler
 *
 * Returns aggregated statistics for a checkout.
 */

import { checkoutService } from "@/lib/services";
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

  // Verify checkout exists
  const checkout = await checkoutService.get(checkoutId);
  if (!checkout) throw new NotFoundError("Checkout not found");

  const stats = await checkoutService.getStats(checkoutId);

  return { stats };
}

// Re-export types for route usage
export type { GetStatsInput };
