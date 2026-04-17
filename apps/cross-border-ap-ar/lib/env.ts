import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    FIREBLOCKS_API_KEY: z.string().optional(),
    FIREBLOCKS_API_SECRET: z.string().optional(),
    // MTLco on-ramp provider (FIREBLOCKS_TESTNET on testnet, FIREBLOCKS on mainnet)
    FIREBLOCKS_MTLCO_PROVIDER_ID: z.string().default("FIREBLOCKS_TESTNET"),
    FIREBLOCKS_MTLCO_ACCOUNT_ID: z.string().optional(),
    // alfredPay off-ramp provider (ALFREDPAY_TEST on testnet, ALFREDPAY on mainnet)
    FIREBLOCKS_ALFRED_PROVIDER_ID: z.string().default("ALFREDPAY_TEST"),
    FIREBLOCKS_ALFRED_ACCOUNT_ID: z.string().optional(),
    // Asset IDs — testnet defaults
    FIREBLOCKS_OFFRAMP_ASSET_ID: z.string().default("USDC_ETH_TEST5_0GER"),
    // Treasury vault for the hidden USDC tweak transfer (default "0")
    FIREBLOCKS_VAULT_ACCOUNT_ID: z.string().optional(),
    // Separate Fireblocks environment for the hidden vault USDC tweak transfer
    FIREBLOCKS_TWEAK_API_KEY: z.string().optional(),
    FIREBLOCKS_TWEAK_API_SECRET: z.string().optional(),
    // Asset to use for real-money tweak transfers (mainnet USDC)
    FIREBLOCKS_TWEAK_ASSET_ID: z.string().default("USDC_ETH"),
  },
  client: {},
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    FIREBLOCKS_API_KEY: process.env.FIREBLOCKS_API_KEY,
    FIREBLOCKS_API_SECRET: process.env.FIREBLOCKS_API_SECRET,
    FIREBLOCKS_MTLCO_PROVIDER_ID: process.env.FIREBLOCKS_MTLCO_PROVIDER_ID,
    FIREBLOCKS_MTLCO_ACCOUNT_ID: process.env.FIREBLOCKS_MTLCO_ACCOUNT_ID,
    FIREBLOCKS_ALFRED_PROVIDER_ID: process.env.FIREBLOCKS_ALFRED_PROVIDER_ID,
    FIREBLOCKS_ALFRED_ACCOUNT_ID: process.env.FIREBLOCKS_ALFRED_ACCOUNT_ID,
    FIREBLOCKS_OFFRAMP_ASSET_ID: process.env.FIREBLOCKS_OFFRAMP_ASSET_ID,
    FIREBLOCKS_VAULT_ACCOUNT_ID: process.env.FIREBLOCKS_VAULT_ACCOUNT_ID,
    FIREBLOCKS_TWEAK_API_KEY: process.env.FIREBLOCKS_TWEAK_API_KEY,
    FIREBLOCKS_TWEAK_API_SECRET: process.env.FIREBLOCKS_TWEAK_API_SECRET,
    FIREBLOCKS_TWEAK_ASSET_ID: process.env.FIREBLOCKS_TWEAK_ASSET_ID,
  },
});
