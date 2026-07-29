/**
 * Dashboard-side Rain client factory.
 *
 * The only sanctioned reader of RAIN_API_KEY (hard rule 3). Lazily builds
 * and memoizes a RainClient for the /api/rain/* route handlers.
 * Sandbox-by-default (D-005) via RAIN_API_BASE_URL.
 */

import { RainClient } from "@dynamic-demos/rain";

import { env } from "@/env";

let cached: RainClient | null = null;

/**
 * Build (and memoize) the Rain client. Throws when RAIN_API_KEY is unset -
 * routes catch and convert this into a 500 via handleApiError.
 */
export function getRainClient(): RainClient {
  if (cached) return cached;

  const apiKey = env.RAIN_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Rain credentials are not configured. Set RAIN_API_KEY.",
    );
  }

  cached = new RainClient({ apiKey, baseUrl: env.RAIN_API_BASE_URL });
  return cached;
}
