/**
 * Environment variable configuration and validation
 *
 * This file uses @t3-oss/env-nextjs for type-safe environment variables.
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
    /**
     * Alchemy API key (server-only). Powers the Base Sepolia token
     * balance route - Dynamic's balances API doesn't cover Base Sepolia,
     * so the asset picker reads ERC-20 balances via Alchemy instead.
     * Optional: without it the route 503s and the picker just omits
     * Base Sepolia tokens.
     */
    ALCHEMY_API_KEY: z.string().min(1).optional(),
    /**
     * Signing secret for the Dynamic webhook endpoint pointed at this app.
     * Unset -> /api/webhooks/dynamic fails closed with 401 rather than
     * accepting unsigned deliveries.
     */
    DYNAMIC_WEBHOOK_SECRET: z.string().min(1).optional(),
    /**
     * Dynamic API token (`dyn_...`) used to build the delegated signing
     * client. `DYNAMIC_API_KEY` is the legacy spelling this app already used.
     */
    DYNAMIC_API_TOKEN: z.string().min(1).optional(),
    DYNAMIC_API_KEY: z.string().min(1).optional(),
    /**
     * RSA private key (PKCS#8 PEM, raw or base64-wrapped) registered with
     * Dynamic. Decrypts the `wallet.delegation.created` envelope.
     */
    DELEGATION_RSA_PRIVATE_KEY: z.string().min(1).optional(),
    /**
     * 32-byte AES-256-GCM key (base64) encrypting delegated materials at rest.
     * Distinct from the RSA key; never shared across environments.
     */
    DELEGATION_ENC_KEY: z.string().min(1).optional(),
    /**
     * Vercel's deployment region (system env var, absent locally). Shown on a
     * delegated signature so the result names where it was produced - a fact
     * the browser cannot invent, which is the point of the demo.
     */
    VERCEL_REGION: z.string().min(1).optional(),
    /** Upstash Redis, the delegated-access store. */
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  },
  client: {
    /**
     * Dynamic Labs Environment ID
     * Retrieved from the Dynamic dashboard (https://app.dynamic.xyz)
     */
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().min(1, {
      message: "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is required",
    }),

    /**
     * Dashboard API URL
     * Base URL for the demo-dashboard API (handles wallet configs)
     * Defaults to http://localhost:4000 in development
     */
    NEXT_PUBLIC_DASHBOARD_API_URL: z
      .string()
      .url()
      .default("http://localhost:4000"),

    /**
     * GTM analytics tracker base URL (@dynamic-demos/analytics). Optional -
     * unset means <GtmTracker> and useTrack() are total no-ops (Phase 02
     * guarantee), so the app builds and runs without it.
     */
    NEXT_PUBLIC_TRACK_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    NEXT_PUBLIC_DASHBOARD_API_URL: process.env.NEXT_PUBLIC_DASHBOARD_API_URL,
    NEXT_PUBLIC_TRACK_URL: process.env.NEXT_PUBLIC_TRACK_URL,
    NODE_ENV: process.env.NODE_ENV,
    ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
    DYNAMIC_WEBHOOK_SECRET: process.env.DYNAMIC_WEBHOOK_SECRET,
    DYNAMIC_API_TOKEN: process.env.DYNAMIC_API_TOKEN,
    DYNAMIC_API_KEY: process.env.DYNAMIC_API_KEY,
    DELEGATION_RSA_PRIVATE_KEY: process.env.DELEGATION_RSA_PRIVATE_KEY,
    DELEGATION_ENC_KEY: process.env.DELEGATION_ENC_KEY,
    VERCEL_REGION: process.env.VERCEL_REGION,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  },
});
