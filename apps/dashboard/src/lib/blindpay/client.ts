/**
 * Dashboard-side BlindPay client factory.
 *
 * Thin wrapper around `@dynamic-demos/blindpay` that resolves credentials
 * from `env.ts` (Zod-validated) and exposes a lazily-constructed singleton
 * for the `/api/blindpay/*` route handlers. Sandbox-by-default (D-005) —
 * the dashboard opts into production via the standard `[prod-creds]` PR
 * flow, not by mutating this factory.
 *
 * Phase 1B-blindpay: extracted from `src/lib/services/blindpay.ts`.
 */

import {
  createBlindpayClient,
  type BlindpayClient,
} from "@dynamic-demos/blindpay";

import { env } from "@/env";

let cached: BlindpayClient | null = null;

/**
 * Lazily build (and memoize) the BlindPay client. Throws when
 * `BLINDPAY_INSTANCE_ID` or `BLINDPAY_API_KEY` are unset — routes catch and
 * convert this into a 500 via `handleApiError`.
 */
export function getBlindpayClient(): BlindpayClient {
  if (cached) return cached;

  const instanceId = env.BLINDPAY_INSTANCE_ID;
  const apiKey = env.BLINDPAY_API_KEY;

  if (!instanceId || !apiKey) {
    throw new Error(
      "BlindPay credentials are not configured. Set BLINDPAY_INSTANCE_ID and BLINDPAY_API_KEY.",
    );
  }

  cached = createBlindpayClient({
    env: "sandbox",
    instanceId,
    apiKey,
    apiUrl: env.BLINDPAY_API_URL,
  });
  return cached;
}
