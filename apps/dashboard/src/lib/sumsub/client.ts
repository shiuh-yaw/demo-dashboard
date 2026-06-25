/**
 * Dashboard-side SumSub client factory.
 *
 * Thin wrapper around `@dynamic-demos/sumsub` that resolves credentials from
 * `env.ts` (Zod-validated) and exposes a lazily-constructed singleton for
 * the `/api/sumsub/*` route handlers. Sandbox-by-default (D-005).
 *
 * This module is the only sanctioned env-reader for SumSub credentials. The
 * `@dynamic-demos/sumsub` package itself reads no `process.env`.
 */

import { createSumsubClient, type SumsubClient } from "@dynamic-demos/sumsub";
import { env } from "@/env";

let cached: SumsubClient | null = null;

/**
 * Lazily build (and memoize) the SumSub client. Throws when credentials are
 * unset — routes catch and convert this into a 500 via `handleApiError`.
 */
export function getSumsubClient(): SumsubClient {
  if (cached) return cached;

  const appToken = env.SUMSUB_APP_TOKEN;
  const secretKey = env.SUMSUB_SECRET_KEY;

  if (!appToken || !secretKey) {
    throw new Error(
      "SumSub credentials are not configured. Set SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY.",
    );
  }

  cached = createSumsubClient({
    appToken,
    secretKey,
    env: env.SUMSUB_ENVIRONMENT === "production" ? "production" : "sandbox",
  });
  return cached;
}
