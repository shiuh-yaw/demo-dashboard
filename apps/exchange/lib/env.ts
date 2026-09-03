/**
 * Environment variable configuration and validation (@t3-oss/env-nextjs).
 *
 * The Dynamic environment id is OPTIONAL here, unlike most demos: Exchange has a
 * staged mode that never creates a Dynamic client, so the app must boot with
 * nothing but defaults on a stage laptop. Live mode still refuses to create a
 * client without an id (`resolveCredentials`, D-003) - it just fails at the
 * moment live mode is asked for, not at import time.
 */
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    /** Live-mode faucet treasury key (server only, never NEXT_PUBLIC). Unset = no faucet. */
    FAUCET_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
    /** Per-request cap in USDC (default 50). */
    FAUCET_MAX_USDC: z.coerce.number().positive().optional(),
    /** Per-address cap per 24h in USDC (default 200). */
    FAUCET_DAILY_PER_ADDRESS: z.coerce.number().positive().optional(),
    /** Server-side Sepolia RPC for the faucet; falls back to the public one. */
    SEPOLIA_RPC_URL: z.string().url().optional(),
  },
  client: {
    /** Dynamic environment id - optional; absent means staged mode. */
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().min(1).optional(),
    /** Force "staged" or "live" regardless of whether an id is present. */
    NEXT_PUBLIC_EXCHANGE_MODE: z.enum(["staged", "live"]).optional(),
    /** Sepolia RPC for live-mode balance reads; a public RPC is the fallback. */
    NEXT_PUBLIC_SEPOLIA_RPC_URL: z.string().url().optional(),
    /** GTM analytics tracker base URL - unset means every emitter is a no-op. */
    NEXT_PUBLIC_TRACK_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    FAUCET_PRIVATE_KEY: process.env.FAUCET_PRIVATE_KEY,
    FAUCET_MAX_USDC: process.env.FAUCET_MAX_USDC,
    FAUCET_DAILY_PER_ADDRESS: process.env.FAUCET_DAILY_PER_ADDRESS,
    SEPOLIA_RPC_URL: process.env.SEPOLIA_RPC_URL,
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    NEXT_PUBLIC_EXCHANGE_MODE: process.env.NEXT_PUBLIC_EXCHANGE_MODE,
    NEXT_PUBLIC_SEPOLIA_RPC_URL: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
    NEXT_PUBLIC_TRACK_URL: process.env.NEXT_PUBLIC_TRACK_URL,
  },
  emptyStringAsUndefined: true,
});
