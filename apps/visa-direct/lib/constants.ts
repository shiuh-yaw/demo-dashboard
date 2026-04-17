/**
 * Application-wide constants for Visa Direct demo.
 *
 * Branding strings (app name, subtitle, banner) are config-driven — see
 * `DEFAULT_VISA_DIRECT_CONFIG` in `@/lib/visa-direct-config` for defaults.
 */

export const DEFAULT_METHOD_STORAGE_KEY = "vd_default_payout_method";

export type PayoutMethod = "bank" | "wallet" | "card";

/**
 * Upper bound (in USD) on the simulated payout amount. This is a
 * sales-demo app — we never want a hand on the keyboard to accidentally
 * trigger a four-figure Fireblocks transfer on the wallet path. The
 * modal enforces it in the form and the `/api/payout` route enforces
 * it server-side as a safety net against anyone editing the DOM.
 */
export const PAYOUT_SIMULATION_MAX_USD = 10;
