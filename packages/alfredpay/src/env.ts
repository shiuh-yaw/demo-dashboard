/**
 * AlfredPay environment + endpoint resolution.
 *
 * Sandbox-by-default per DECISIONS.md D-005. Every public function in this
 * package takes (or accepts a client carrying) `env: AlfredpayEnvironment`.
 *
 * Endpoint hosts:
 * - Sandbox:    https://api.sandbox.alfredpay.io
 * - Production: https://api.alfredpay.io
 *
 * @see https://alfredpay.readme.io
 */

export type AlfredpayEnvironment = "sandbox" | "production";

export const ALFREDPAY_SANDBOX_BASE_URL = "https://api.sandbox.alfredpay.io";
export const ALFREDPAY_PRODUCTION_BASE_URL = "https://api.alfredpay.io";

/**
 * Resolves the alfredPay HTTP host for the given environment, optionally
 * overridden by `baseUrl` (e.g. for local mocks or staging proxies).
 *
 * The override always wins so demos can run against a recorded fixture server
 * without flipping `env`.
 */
export function resolveAlfredpayBaseUrl(
  env: AlfredpayEnvironment,
  baseUrl?: string,
): string {
  if (baseUrl && baseUrl.length > 0) return baseUrl;
  return env === "production"
    ? ALFREDPAY_PRODUCTION_BASE_URL
    : ALFREDPAY_SANDBOX_BASE_URL;
}
