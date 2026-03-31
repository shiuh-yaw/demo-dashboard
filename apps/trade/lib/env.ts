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

    /** Dashboard API URL for fetching trade configs */
    DASHBOARD_API_URL: z.string().url().default("http://localhost:4000"),

    /** Alchemy API key for Prices API (current + historical) */
    ALCHEMY_API_KEY: z.string().min(1, {
      message: "ALCHEMY_API_KEY is required for trade prices",
    }),

    /** CoinGecko Demo API key for market list (api.coingecko.com). Optional. */
    COIN_GECKO_API_KEY: z.string().optional(),

    /** Dynamic admin API key for KYC metadata (getUser, updateUserMetadata). Optional. */
    DYNAMIC_API_KEY: z.string().optional(),

    /** Fireblocks API Key (optional; use mock when absent in dev) */
    FIREBLOCKS_API_KEY: z.string().optional(),

    /** Fireblocks API Secret */
    FIREBLOCKS_API_SECRET: z.string().optional(),

    /** Fireblocks API Base URL (sandbox or production) */
    FIREBLOCKS_API_BASE_URL: z.string().optional(),

    /** Fireblocks default asset ID (e.g. BASE_USDC). Required for vault creation. */
    FIREBLOCKS_DEFAULT_ASSET_ID: z.string().optional(),
  },
  client: {
    /** Dynamic Labs Environment ID */
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().min(1, {
      message: "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is required",
    }),

    /** Public app URL */
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:4005"),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DASHBOARD_API_URL: process.env.DASHBOARD_API_URL,
    ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
    COIN_GECKO_API_KEY: process.env.COIN_GECKO_API_KEY,
    DYNAMIC_API_KEY: process.env.DYNAMIC_API_KEY,
    FIREBLOCKS_API_KEY: process.env.FIREBLOCKS_API_KEY,
    FIREBLOCKS_API_SECRET: process.env.FIREBLOCKS_API_SECRET,
    FIREBLOCKS_API_BASE_URL: process.env.FIREBLOCKS_API_BASE_URL,
    FIREBLOCKS_DEFAULT_ASSET_ID: process.env.FIREBLOCKS_DEFAULT_ASSET_ID,
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});
