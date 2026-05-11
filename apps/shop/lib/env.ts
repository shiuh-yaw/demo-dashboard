import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DYNAMIC_API_KEY: z.string().min(1),
    SETTLEMENT_EVM_ADDRESS: z.string().min(1),
    SETTLEMENT_SOL_ADDRESS: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().min(1),
    /**
     * Dashboard API URL — used server-side by `lib/api/shops.ts` to fetch
     * shop config records. Defaults to localhost:4000 in development.
     */
    NEXT_PUBLIC_DASHBOARD_API_URL: z
      .string()
      .url()
      .default("http://localhost:4000"),
  },
  runtimeEnv: {
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    NEXT_PUBLIC_DASHBOARD_API_URL: process.env.NEXT_PUBLIC_DASHBOARD_API_URL,
    NODE_ENV: process.env.NODE_ENV,
    DYNAMIC_API_KEY: process.env.DYNAMIC_API_KEY,
    SETTLEMENT_EVM_ADDRESS: process.env.SETTLEMENT_EVM_ADDRESS,
    SETTLEMENT_SOL_ADDRESS: process.env.SETTLEMENT_SOL_ADDRESS,
  },
});
