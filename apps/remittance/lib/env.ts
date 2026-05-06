/**
 * Environment variable configuration and validation
 */
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),

    /** Fireblocks API Key */
    FIREBLOCKS_API_KEY: z.string().optional(),

    /** Fireblocks API Secret */
    FIREBLOCKS_API_SECRET: z.string().optional(),

    /** Fireblocks API Base URL (sandbox or production) */
    FIREBLOCKS_API_BASE_URL: z.string().optional(),

    /** Fireblocks omnibus vault ID for fund/release operations */
    FIREBLOCKS_OMNIBUS_VAULT_ID: z.string().optional(),

    /** Fireblocks default asset ID for omnibus (e.g. DUSD_B724A1Y3_RPM5). Check /admin/assets for supported IDs. */
    FIREBLOCKS_DEFAULT_ASSET_ID: z.string().optional(),

    /**
     * Dynamic API key for server-side admin operations.
     *
     * Required — every server-side flow that touches Dynamic (KYC approve,
     * user lookup, WaaS create, metadata updates) needs it.
     *
     * IMPORTANT: must be issued for the same Dynamic project as
     * NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID. A token from a different project
     * will return 401 Unauthorized on every admin call.
     */
    DYNAMIC_API_KEY: z.string().min(1, {
      message:
        "DYNAMIC_API_KEY is required (same Dynamic project as NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID).",
    }),

    /** Alchemy API key for transaction history */
    ALCHEMY_API_KEY: z.string().min(1, {
      message: "ALCHEMY_API_KEY is required",
    }),
  },
  client: {
    /** Dynamic Labs Environment ID */
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().min(1, {
      message: "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is required",
    }),
    /**
     * Dashboard API URL for remittance configs (theme/branding)
     * Same as earn: NEXT_PUBLIC_API_BASE_URL
     */
    NEXT_PUBLIC_API_BASE_URL: z
      .string()
      .url()
      .default("http://localhost:4000"),
  },
  runtimeEnv: {
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    FIREBLOCKS_API_KEY: process.env.FIREBLOCKS_API_KEY,
    FIREBLOCKS_API_SECRET: process.env.FIREBLOCKS_API_SECRET,
    FIREBLOCKS_API_BASE_URL: process.env.FIREBLOCKS_API_BASE_URL,
    FIREBLOCKS_OMNIBUS_VAULT_ID: process.env.FIREBLOCKS_OMNIBUS_VAULT_ID,
    FIREBLOCKS_DEFAULT_ASSET_ID: process.env.FIREBLOCKS_DEFAULT_ASSET_ID,
    DYNAMIC_API_KEY: process.env.DYNAMIC_API_KEY,
    ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
  },
});
