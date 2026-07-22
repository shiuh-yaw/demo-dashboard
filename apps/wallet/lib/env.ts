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
  },
});
