/**
 * Environment variable configuration and validation.
 */
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),

    /**
     * Dynamic admin API token, for the routes under `app/api/` that read and
     * write user metadata. Server-only and secret - never `NEXT_PUBLIC_`.
     *
     * Optional so the app builds and the widget runs without it; the routes
     * that need it fail on their own with a message naming this variable,
     * rather than the whole app refusing to boot over a feature most of it
     * does not use.
     */
    DYNAMIC_API_KEY: z.string().min(1).optional(),
  },
  client: {
    /**
     * Dynamic environment id (https://app.dynamic.xyz). Must be an
     * environment with the `enable-business-accounts` flag on - see
     * `.env.example`.
     */
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().min(1, {
      message: "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is required",
    }),

    /** demo-dashboard API base URL (per-prospect theme configs). */
    NEXT_PUBLIC_DASHBOARD_API_URL: z
      .string()
      .url()
      .default("http://localhost:4000"),

    /**
     * GTM analytics ingest base URL (@dynamic-demos/analytics). Optional -
     * unset means <GtmTracker> and useTrack() are total no-ops, so the app
     * builds and runs without it.
     */
    NEXT_PUBLIC_TRACK_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    NEXT_PUBLIC_DASHBOARD_API_URL: process.env.NEXT_PUBLIC_DASHBOARD_API_URL,
    NEXT_PUBLIC_TRACK_URL: process.env.NEXT_PUBLIC_TRACK_URL,
    NODE_ENV: process.env.NODE_ENV,
    DYNAMIC_API_KEY: process.env.DYNAMIC_API_KEY,
  },
});
