/**
 * Rain environment / endpoint resolution.
 *
 * Sandbox-by-default (hard rule 4). The package never reads process.env
 * (decision D1) - the dashboard-side getRainClient injects the base URL.
 * Rain's production host is set explicitly via the dashboard env, so this
 * resolver takes an optional override string rather than an env enum.
 */

export const RAIN_SANDBOX_BASE_URL = "https://api-dev.raincards.xyz";

/** Return the override when it is a non-blank string, else the sandbox host. */
export function resolveRainBaseUrl(override?: string): string {
  return override && override.trim() ? override : RAIN_SANDBOX_BASE_URL;
}
