/**
 * Environment variable configuration and validation
 */
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * `shared` vars are available on both the server and the client.
   * `NODE_ENV` is the canonical example — we read it from client
   * components (DynamicInit dev-logging gate) and from server routes
   * (secure cookie flag), and t3-env's `server` block would block the
   * client read.
   */
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  server: {
    /**
     * Fireblocks API Key (server-only).
     * Optional — when absent, the Fireblocks client falls back to mock
     * responses so the demo still works locally without real credentials.
     */
    FIREBLOCKS_API_KEY: z.string().optional(),

    /**
     * Fireblocks API Secret (server-only, base64 PEM).
     * Optional — see FIREBLOCKS_API_KEY above.
     */
    FIREBLOCKS_API_SECRET: z.string().optional(),

    /**
     * Fireblocks connected account ID for the MTLco Exchange Account.
     * Required — used as `via.accountId` in the POST /v1/trading/orders
     * payload. Even in mock mode we still construct the request, so this
     * must always be set.
     */
    FIREBLOCKS_VAULT_ACCOUNT_ID: z.string().min(1, {
      message: "FIREBLOCKS_VAULT_ACCOUNT_ID is required",
    }),

    /**
     * Fireblocks trading provider ID for the connected MTLco account.
     * Required. "FIREBLOCKS_TESTNET" on sandbox/testnet, "FIREBLOCKS" on
     * mainnet.
     */
    FIREBLOCKS_PROVIDER_ID: z.enum(["FIREBLOCKS_TESTNET", "FIREBLOCKS"], {
      errorMap: () => ({
        message:
          'FIREBLOCKS_PROVIDER_ID must be "FIREBLOCKS_TESTNET" or "FIREBLOCKS"',
      }),
    }),

    /**
     * Fireblocks asset ID for payouts.
     * Required — used as `executionRequestDetails.quoteAssetId`.
     * e.g. "USDC_ETH_TEST5_0GER" on Sepolia, "USDC_ETH" on mainnet.
     */
    FIREBLOCKS_ASSET_ID: z.string().min(1, {
      message: "FIREBLOCKS_ASSET_ID is required",
    }),

    /** Visa Direct API Key (server-only, stubbed Phase 1-2) */
    VISA_DIRECT_API_KEY: z.string().optional(),

    /** Visa Direct base URL (configurable per environment) */
    VISA_DIRECT_BASE_URL: z.string().optional(),

    /** Dynamic admin API key — required for user metadata persistence (optional, falls back to localStorage) */
    DYNAMIC_API_KEY: z.string().optional(),

    /**
     * Dashboard API URL for fetching Visa Direct configs (branding + theme).
     * Defaults to http://localhost:4000 in local dev.
     */
    DASHBOARD_API_URL: z
      .string()
      .url()
      .optional()
      .default("http://localhost:4000"),
  },
  client: {
    /**
     * Dynamic Labs Environment ID.
     * Must match the value used by the shared @dynamic-demos/dynamic package
     * (it reads NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID for admin API and JWKS calls).
     */
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().min(1, {
      message: "NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is required",
    }),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    FIREBLOCKS_API_KEY: process.env.FIREBLOCKS_API_KEY,
    FIREBLOCKS_API_SECRET: process.env.FIREBLOCKS_API_SECRET,
    FIREBLOCKS_VAULT_ACCOUNT_ID: process.env.FIREBLOCKS_VAULT_ACCOUNT_ID,
    FIREBLOCKS_PROVIDER_ID: process.env.FIREBLOCKS_PROVIDER_ID,
    FIREBLOCKS_ASSET_ID: process.env.FIREBLOCKS_ASSET_ID,
    VISA_DIRECT_API_KEY: process.env.VISA_DIRECT_API_KEY,
    VISA_DIRECT_BASE_URL: process.env.VISA_DIRECT_BASE_URL,
    DYNAMIC_API_KEY: process.env.DYNAMIC_API_KEY,
    DASHBOARD_API_URL: process.env.DASHBOARD_API_URL,
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
  },
});
