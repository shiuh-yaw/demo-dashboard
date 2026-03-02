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
  },
  runtimeEnv: {
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    NEXT_PUBLIC_DASHBOARD_API_URL: process.env.NEXT_PUBLIC_DASHBOARD_API_URL,
    NODE_ENV: process.env.NODE_ENV,
  },
});
