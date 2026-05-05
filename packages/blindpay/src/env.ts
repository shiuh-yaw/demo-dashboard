/**
 * BlindPay environment + endpoint resolution.
 *
 * Per D-005, every provider package exports a `ProviderEnvironment` union
 * with `'sandbox'` as the default. BlindPay's API surface is the same
 * across environments — the per-environment isolation comes from the
 * BlindPay instance ID + API key the consumer uses, not from a different
 * URL. This module still exists so consumers must declare which environment
 * they're operating in (forces deliberate opt-in for production credentials).
 */

export type BlindpayEnvironment = "sandbox" | "production";

/**
 * Default REST API URL. Identical for sandbox and production — separation
 * happens via BlindPay instance + API key, not host. Override via the
 * `apiUrl` option to {@link createBlindpayClient}.
 */
export const DEFAULT_BLINDPAY_API_URL = "https://api.blindpay.com/v1";

/**
 * Resolve the API URL for a given environment. Both modes use the same
 * host today; a future BlindPay sandbox host would be added here.
 */
export function resolveBlindpayApiUrl(_env: BlindpayEnvironment): string {
  return DEFAULT_BLINDPAY_API_URL;
}
