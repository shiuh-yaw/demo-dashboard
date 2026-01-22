/**
 * Get Checkout Config Handler
 *
 * Returns a checkout configuration for rendering widgets.
 * This is a public handler (no auth required).
 */

import { checkoutService } from "@/lib/services";
import { NotFoundError } from "@/lib/errors";
import { parseWithSchema, checkoutIdSchema } from "@/lib/validation";
import type { WidgetConfig } from "@/lib/widget-config";

interface GetCheckoutResult {
  id: string;
  name: string;
  description?: string;
  config: WidgetConfig;
}

export async function handleGetCheckout(
  rawInput: unknown
): Promise<GetCheckoutResult> {
  const { checkoutId } = parseWithSchema(checkoutIdSchema, rawInput);

  const checkout = await checkoutService.get(checkoutId);
  if (!checkout) {
    throw new NotFoundError("Checkout not found");
  }

  // Return only the necessary fields for rendering (exclude owner info)
  return {
    id: checkout.id,
    name: checkout.name,
    description: checkout.description,
    config: checkout.config,
  };
}
