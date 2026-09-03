/**
 * Environment variable configuration and validation (@t3-oss/env-nextjs).
 *
 * The Dynamic environment id is OPTIONAL here, unlike most demos: Rimau has a
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
  },
  client: {
    /** Dynamic environment id - optional; absent means staged mode. */
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().min(1).optional(),
    /** Force "staged" or "live" regardless of whether an id is present. */
    NEXT_PUBLIC_RIMAU_MODE: z.enum(["staged", "live"]).optional(),
    /** Sepolia RPC for live-mode balance reads; a public RPC is the fallback. */
    NEXT_PUBLIC_SEPOLIA_RPC_URL: z.string().url().optional(),
    /** GTM analytics tracker base URL - unset means every emitter is a no-op. */
    NEXT_PUBLIC_TRACK_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    NEXT_PUBLIC_RIMAU_MODE: process.env.NEXT_PUBLIC_RIMAU_MODE,
    NEXT_PUBLIC_SEPOLIA_RPC_URL: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
    NEXT_PUBLIC_TRACK_URL: process.env.NEXT_PUBLIC_TRACK_URL,
  },
  emptyStringAsUndefined: true,
});
