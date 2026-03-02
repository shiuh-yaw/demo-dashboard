import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /*
   * Server side Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    /**
     * Node Environment
     */
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  /*
   * Environment variables available on the client (and server).
   *
   * 💡 You'll get type errors if these are not prefixed with NEXT_PUBLIC_.
   */
  client: {
    /**
     * Dynamic Labs Environment ID
     * Retrieved from the Dynamic dashboard (https://app.dynamic.xyz)
     * This identifies your Dynamic Labs project/environment
     */
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().min(1),
    /**
     * Dashboard API URL
     * Base URL for the demo-dashboard API (handles earn configs)
     * Defaults to http://localhost:4000
     */
    NEXT_PUBLIC_API_BASE_URL: z
      .string()
      .url()
      .default("http://localhost:4000"),
  },
  /*
   * Due to how Next.js bundles environment variables on Edge and Client,
   * we need to manually destructure them to make sure all are included in bundle.
   *
   * 💡 You'll get type errors if not all variables from `server` & `client` are included here.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
});

