/**
 * Type-safe env access for apps/flow via `@t3-oss/env-nextjs`.
 *
 * Every variable consumed by this app is declared here; importing `env`
 * triggers validation at module load. Sibling apps mirror this pattern
 * (see `apps/checkouts/lib/env.ts`, `apps/shop/lib/env.ts`).
 *
 * `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` is also read inside
 * `@dynamic-demos/dynamic` (resolve-credentials, jwt) directly from
 * `process.env`. Declaring it here gives this app a fail-fast check at
 * startup so we surface the missing config alongside the other vars
 * instead of deep inside the SDK.
 */
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import { normalizeBaseUrl } from "@/lib/normalize-base-url";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    /**
     * Environment-scoped admin API token (matches every other demo app's
     * naming). Used server-side by POST /api/checkouts (needs flow.write) and
     * by the /kyc-deposit metadata routes via `@dynamic-demos/dynamic` (needs
     * user read+write). Must belong to the same Dynamic environment as
     * NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID.
     */
    DYNAMIC_API_KEY: z.string().min(1).optional(),
    DASHBOARD_API_URL: z.preprocess(
      normalizeBaseUrl,
      z.string().url().optional(),
    ),
  },
  client: {
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().min(1, {
      message: "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is required",
    }),
    NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID: z.string().min(1).optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DYNAMIC_API_KEY: process.env.DYNAMIC_API_KEY,
    DASHBOARD_API_URL: process.env.DASHBOARD_API_URL,
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID,
  },
  /**
   * Treat empty-string env vars (a common deployment footgun — adding a var
   * in the host UI with no value) as `undefined` so `.optional()` applies
   * instead of failing validation and crashing route modules at import.
   */
  emptyStringAsUndefined: true,
});
