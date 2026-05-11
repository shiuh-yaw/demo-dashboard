import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    /** Dynamic admin API: resolve inbound sender and read embedded wallet address. */
    DYNAMIC_API_KEY: z.string().min(1, {
      message:
        "DYNAMIC_API_KEY is required for deposit webhook sender verification",
    }),
    FIREBLOCKS_API_KEY: z.string().min(1, {
      message: "FIREBLOCKS_API_KEY is required",
    }),
    FIREBLOCKS_API_SECRET: z.string().min(1, {
      message: "FIREBLOCKS_API_SECRET is required",
    }),
    /** Defaults to Fireblocks sandbox API base if omitted */
    FIREBLOCKS_API_BASE_URL: z.string().url().optional(),
    /**
     * JWKS URL for `Fireblocks-Webhook-Signature` (RS512 detached JWS).
     * Defaults: sandbox API base → sandbox-keys; otherwise US production keys.
     * EU: https://eu-keys.fireblocks.io/.well-known/jwks.json
     */
    FIREBLOCKS_WEBHOOK_JWKS_URL: z.string().url().optional(),
    /** Legacy: verify `Fireblocks-Signature` with PEM public key (manual rotation). */
    FIREBLOCKS_WEBHOOK_PUBLIC_KEY: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().min(1, {
      message: "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is required",
    }),
    NEXT_PUBLIC_NETWORK: z
      .enum(["base", "base-sepolia"])
      .default("base-sepolia"),
    /**
     * Dashboard API URL — base URL for the demo-dashboard API
     * (handles per-config wallet/deposit configurations consumed by
     * `app/layout.tsx` for SSR theme injection). Defaults to
     * http://localhost:4000 in development.
     */
    NEXT_PUBLIC_DASHBOARD_API_URL: z
      .string()
      .url()
      .default("http://localhost:4000"),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DYNAMIC_API_KEY: process.env.DYNAMIC_API_KEY,
    FIREBLOCKS_API_KEY: process.env.FIREBLOCKS_API_KEY,
    FIREBLOCKS_API_SECRET: process.env.FIREBLOCKS_API_SECRET,
    FIREBLOCKS_API_BASE_URL: process.env.FIREBLOCKS_API_BASE_URL,
    FIREBLOCKS_WEBHOOK_JWKS_URL: process.env.FIREBLOCKS_WEBHOOK_JWKS_URL,
    FIREBLOCKS_WEBHOOK_PUBLIC_KEY: process.env.FIREBLOCKS_WEBHOOK_PUBLIC_KEY,
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK,
    NEXT_PUBLIC_DASHBOARD_API_URL: process.env.NEXT_PUBLIC_DASHBOARD_API_URL,
  },
});
