/**
 * Dashboard-side Coinbase Onramp client factory.
 *
 * Thin wrapper around `@dynamic-demos/coinbase-onramp` that resolves
 * credentials from `env.ts` (Zod-validated) and exposes a lazily-constructed
 * singleton for the `/api/coinbase/*` route handlers. Sandbox-by-default
 * (D-005) — the dashboard opts into production via the standard
 * `[prod-creds]` PR flow, not by mutating this factory.
 *
 * This module is the only sanctioned env-reader for Coinbase credentials.
 * The `@dynamic-demos/coinbase-onramp` package itself reads no `process.env`.
 */

import {
  createCoinbaseOnrampClient,
  type CoinbaseOnrampClient,
} from "@dynamic-demos/coinbase-onramp";

import { env } from "@/env";

let cached: CoinbaseOnrampClient | null = null;

/**
 * Lazily build (and memoize) the Coinbase Onramp client. Throws when
 * `COINBASE_API_KEY` or `COINBASE_API_SECRET` are unset —
 * routes catch and convert this into a 500 via `handleApiError`.
 *
 * Environment is selected via `COINBASE_API_ENVIRONMENT`
 * (`sandbox` by default per D-005, `production` opt-in via `[prod-creds]`).
 */
export function getCoinbaseOnrampClient(): CoinbaseOnrampClient {
  if (cached) return cached;

  const apiKey = env.COINBASE_API_KEY;
  const apiSecret = env.COINBASE_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "Coinbase Onramp credentials are not configured. Set COINBASE_API_KEY and COINBASE_API_SECRET.",
    );
  }

  cached = createCoinbaseOnrampClient({
    env: env.COINBASE_API_ENVIRONMENT,
    apiKey,
    apiSecret,
  });
  return cached;
}
