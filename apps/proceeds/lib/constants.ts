export const APP_NAME = "Proceeds";

/**
 * Upper bound (in USDC) on a simulated proceeds payout. This is a
 * sales-demo app — we never want a typo in the modal or a DOM tweak
 * to accidentally trigger a four-figure Fireblocks transfer. The
 * payout modal enforces it client-side and `/api/payout` enforces
 * it server-side as a safety net.
 */
export const PAYOUT_SIMULATION_MAX_USDC = 10;
