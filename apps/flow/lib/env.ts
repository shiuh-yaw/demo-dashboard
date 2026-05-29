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

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    /**
     * Environment-scoped admin API token used by /api/checkouts to
     * create per-withdraw Flow Checkouts. Server-only — never bundle
     * into the client. Required for the withdraw scenario; optional
     * otherwise (checkout / deposit use a pre-baked Checkout id).
     */
    DYNAMIC_API_TOKEN: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().min(1, {
      message: "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is required",
    }),
    NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID: z.string().min(1).optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DYNAMIC_API_TOKEN: process.env.DYNAMIC_API_TOKEN,
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID,
  },
});
