/**
 * Proceeds-side Iron env-reader for the simple offramp helpers.
 *
 * The `@dynamic-demos/iron` package never reads `process.env` — env-reading is
 * the consumer's responsibility. This module is the single sanctioned spot in
 * `apps/proceeds` where Iron env vars are surfaced into a `SimpleOfframpConfig`
 * for `getOfframpQuote` / `createOfframp`.
 *
 * Sandbox-by-default per D-005. `IRON_ENVIRONMENT` flips to `production` only
 * when set explicitly via the standard `[prod-creds]` PR flow.
 */

import type { SimpleOfframpConfig } from "@dynamic-demos/iron";

import { env } from "./env";

/**
 * Build the `SimpleOfframpConfig` consumed by `getOfframpQuote` /
 * `createOfframp`. Throws when required Iron env vars are missing — route
 * handlers catch this and return a 500 (matches the previous behavior when
 * the package itself threw on missing env).
 */
export function getSimpleOfframpConfig(): SimpleOfframpConfig {
  const apiKey = env.IRON_API_KEY;
  const customerId = env.IRON_DEMO_CUSTOMER_ID;
  const bankIban = env.IRON_DEMO_BANK_IBAN;

  if (!apiKey) {
    throw new Error(
      "Iron credentials are not configured. Set IRON_API_KEY.",
    );
  }
  if (!customerId || !bankIban) {
    throw new Error(
      "IRON_DEMO_CUSTOMER_ID and IRON_DEMO_BANK_IBAN are required",
    );
  }

  return {
    apiKey,
    customerId,
    bankIban,
    env: env.IRON_ENVIRONMENT === "production" ? "production" : "sandbox",
  };
}
