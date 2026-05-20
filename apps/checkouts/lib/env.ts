/**
 * Environment variable configuration and validation
 *
 * This file uses @t3-oss/env-nextjs for type-safe environment variables.
 * All environment variables are validated at build time, ensuring proper configuration.
 *
 * Required variables:
 * - NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: Dynamic environment ID (from Dynamic dashboard)
 * - NEXT_PUBLIC_DASHBOARD_API_URL: Dashboard API URL for checkout/transaction APIs
 */
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    /**
     * Node Environment
     */
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  client: {
    /**
     * Dynamic Labs Environment ID
     * Retrieved from the Dynamic dashboard (https://app.dynamic.xyz)
     * This identifies your Dynamic Labs project/environment
     */
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().min(1, {
      message: "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is required",
    }),

    /**
     * Dashboard API URL
     * Base URL for the demo-dashboard API (handles checkouts, transactions, swaps, etc.)
     * Defaults to http://localhost:4000 in development
     */
    NEXT_PUBLIC_DASHBOARD_API_URL: z
      .string()
      .url()
      .default("http://localhost:4000"),

    /**
     * Dynamic Checkout id (provisioned via the Dynamic REST API).
     * Used as the `checkoutId` in createCheckoutTransaction. One Checkout
     * per Dynamic env id for now; dashboard-managed per-widget provisioning
     * is a future enhancement.
     */
    NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID: z.string().min(1).optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    NEXT_PUBLIC_DASHBOARD_API_URL: process.env.NEXT_PUBLIC_DASHBOARD_API_URL,
    NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_CHECKOUT_ID,
    NODE_ENV: process.env.NODE_ENV,
  },
});
