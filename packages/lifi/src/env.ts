/**
 * Environment configuration for the LI.FI client.
 *
 * Per D-005, every public function takes `env: 'sandbox' | 'production'`.
 * LI.FI does not expose distinct sandbox/production hosts at the REST API
 * level — `https://li.quest/v1` is the sole production endpoint and there
 * is no public sandbox. We still surface the discriminator so demos can
 * gate test/integration runs (e.g. dry-run fixtures) at the call site
 * instead of inside the package.
 */

export type LifiEnvironment = "sandbox" | "production";

export const LIFI_DEFAULT_API_URL = "https://li.quest/v1";

/**
 * Resolve the REST endpoint for the given environment.
 *
 * LI.FI has no separate sandbox host, so both environments resolve to the
 * same URL today. The function exists so callers can stay symmetrical with
 * other provider packages (fireblocks, alfredpay, etc.) and so we have a
 * single seam to update if LI.FI ever ships a sandbox.
 */
export function resolveLifiApiUrl(_env: LifiEnvironment): string {
  return LIFI_DEFAULT_API_URL;
}
