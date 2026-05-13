/**
 * Dashboard-side Iron Finance client factory.
 *
 * Thin wrapper around `@dynamic-demos/iron` that resolves credentials from
 * `env.ts` (Zod-validated) and exposes a lazily-constructed singleton for
 * the `/api/iron/*` route handlers. Sandbox-by-default (D-005) — the
 * dashboard opts into production via the standard `[prod-creds]` PR flow,
 * not by mutating this factory.
 *
 * This module is the only sanctioned env-reader for Iron credentials. The
 * `@dynamic-demos/iron` package itself no longer reads `process.env`.
 */

import {
  createIronClient,
  type IronFinanceClient,
} from "@dynamic-demos/iron";

import { env } from "@/env";

let cached: IronFinanceClient | null = null;

/**
 * Lazily build (and memoize) the Iron client. Throws when `IRON_API_KEY` is
 * unset — routes catch and convert this into a 500 via `handleApiError`.
 */
export function getIronClient(): IronFinanceClient {
  if (cached) return cached;

  const apiKey = env.IRON_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Iron credentials are not configured. Set IRON_API_KEY.",
    );
  }

  cached = createIronClient({
    apiKey,
    env: env.IRON_ENVIRONMENT === "production" ? "production" : "sandbox",
  });
  return cached;
}
