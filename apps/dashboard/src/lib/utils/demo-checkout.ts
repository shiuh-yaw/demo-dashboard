/**
 * Demo Checkout Utilities
 *
 * Provides support for demo/preview checkouts that don't exist in the database.
 * Demo checkouts are identified by IDs starting with "demo-" or "preview-".
 */

import type { StoredCheckoutConfig } from "@/lib/types/dashboard";
import { DEFAULT_WIDGET_CONFIG } from "@/lib/widget-config";

/**
 * Check if a checkout ID is a demo/preview checkout
 */
export function isDemoCheckout(checkoutId: string): boolean {
  return checkoutId.startsWith("demo-") || checkoutId.startsWith("preview-");
}

/**
 * Create a demo/preview checkout configuration
 *
 * Returns a virtual checkout config for demo/preview purposes.
 * The config uses default settings suitable for demos.
 */
export function createDemoCheckoutConfig(
  checkoutId: string
): StoredCheckoutConfig {
  const now = new Date().toISOString();
  const isPreview = checkoutId.startsWith("preview-");

  return {
    id: checkoutId,
    name: isPreview ? "Preview Checkout" : "Demo Checkout",
    description: isPreview
      ? "Preview checkout for live editing"
      : "Demo checkout for testing purposes",
    mode: "deposit",
    config: DEFAULT_WIDGET_CONFIG,
    createdAt: now,
    updatedAt: now,
  };
}
