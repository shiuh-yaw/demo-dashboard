import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    /** Alchemy API key — used server-side for on-chain tx history. */
    ALCHEMY_API_KEY: z.string().min(1, {
      message: "ALCHEMY_API_KEY is required",
    }),
    FIREBLOCKS_API_KEY: z.string().optional(),
    FIREBLOCKS_API_SECRET: z.string().optional(),
    /** IRON Finance (MoonPay) — off-ramp USDC → USD to bank account */
    IRON_API_KEY: z.string().optional(),
    IRON_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
    IRON_DEMO_CUSTOMER_ID: z.string().optional(),
    IRON_DEMO_BANK_IBAN: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().min(1),
  },
  /**
   * Variables available on both the server and client. `NODE_ENV` is the
   * canonical example — Next inlines it at build time so it's safe to read
   * from client code.
   */
  shared: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  runtimeEnv: {
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
    FIREBLOCKS_API_KEY: process.env.FIREBLOCKS_API_KEY,
    FIREBLOCKS_API_SECRET: process.env.FIREBLOCKS_API_SECRET,
    IRON_API_KEY: process.env.IRON_API_KEY,
    IRON_ENVIRONMENT: process.env.IRON_ENVIRONMENT,
    IRON_DEMO_CUSTOMER_ID: process.env.IRON_DEMO_CUSTOMER_ID,
    IRON_DEMO_BANK_IBAN: process.env.IRON_DEMO_BANK_IBAN,
    NODE_ENV: process.env.NODE_ENV,
  },
});
