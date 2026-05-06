import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /*
   * Server side Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    COINBASE_API_KEY: z.string(),
    COINBASE_API_SECRET: z.string(),
    /**
     * LI.FI API Key for cross-chain swaps
     */
    LIFI_API_KEY: z.string(),
    /**
     * Anthropic API key for AI theme extraction (optional)
     */
    ANTHROPIC_API_KEY: z.string().optional(),
    /**
     * Redis URL for local development
     * Defaults to redis://localhost:6379
     * In production, use Upstash Redis (UPSTASH_REDIS_REST_URL/TOKEN)
     */
    REDIS_URL: z.string().url().optional().default("redis://localhost:6379"),
    /**
     * Node Environment
     */
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    /**
     * QStash Token for background job processing
     * Get from https://console.upstash.com/qstash
     */
    QSTASH_TOKEN: z.string().optional(),
    /**
     * QStash Current Signing Key (for verifying incoming webhooks)
     */
    QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
    /**
     * QStash Next Signing Key (for key rotation)
     */
    QSTASH_NEXT_SIGNING_KEY: z.string().optional(),
    /**
     * Base URL for the app (used for QStash callbacks)
     * In production, this should be your deployed URL
     */
    APP_URL: z.string().url().optional(),
    /**
     * Upstash Redis REST URL (for production Redis storage)
     */
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    /**
     * Upstash Redis REST Token (for production Redis storage)
     */
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    /**
     * Cron Secret for authenticating Vercel cron jobs
     */
    CRON_SECRET: z.string().optional(),
    /**
     * BlindPay API URL
     * Defaults to https://api.blindpay.com/v1
     */
    BLINDPAY_API_URL: z
      .string()
      .url()
      .optional()
      .default("https://api.blindpay.com/v1"),
    /**
     * BlindPay Instance ID
     * Required for BlindPay API integration
     */
    BLINDPAY_INSTANCE_ID: z.string().optional(),
    /**
     * BlindPay API Key
     * Required for BlindPay API integration
     */
    BLINDPAY_API_KEY: z.string().optional(),
    /**
     * Iron Finance Environment (production or sandbox)
     * Defaults to production
     */
    IRON_ENVIRONMENT: z
      .enum(["production", "sandbox"])
      .optional()
      .default("production"),
    /**
     * Iron Finance API Key
     * Required for Iron Finance API integration
     * Get from https://app.iron.xyz or https://app.sandbox.iron.xyz
     */
    IRON_API_KEY: z.string().optional(),
    /**
     * Postgres pooled connection URL (Supabase pooler, port 6543).
     * Used at runtime by `@dynamic-demos/db`'s Prisma singleton (D-013).
     * Optional during Phase 2 scaffold — required once the first model
     * lands in PR 2-brands.
     */
    DATABASE_URL: z.string().url().optional(),
    /**
     * Postgres direct connection URL (Supabase direct, port 5432).
     * Used by `prisma migrate` only; never by runtime code (D-013). The
     * pooler does not support DDL transactions.
     * Optional during Phase 2 scaffold — required once the first model
     * lands in PR 2-brands.
     */
    DIRECT_URL: z.string().url().optional(),
    /**
     * Phase 2-brands cutover flag.
     * When "true", the dashboard reads/writes Brand records via Postgres
     * (`@dynamic-demos/db`). When "false" (default), the Redis-backed
     * implementation handles them. The two implementations satisfy the
     * same `BrandService` contract (see lib/services/__tests__/brands.parity.test.ts)
     * so production can be flipped without code changes.
     */
    USE_POSTGRES_BRANDS: z
      .enum(["true", "false"])
      .optional()
      .default("false")
      .transform((v) => v === "true"),
    /**
     * Phase 2-transactions cutover flag.
     * When "true", the dashboard reads/writes canonical TransactionRecord
     * rows (the state-machine carrier from `@dynamic-demos/transactions`)
     * via Postgres (`@dynamic-demos/db`). When "false" (default), the
     * Redis-backed implementation handles them. Both implementations
     * satisfy the same `TransactionRecordService` contract (see
     * lib/services/__tests__/transactions.parity.test.ts) and call
     * `assertValidTransition` at the boundary before every state mutation.
     *
     * The webhook event store is Postgres-only by design (D-011): when
     * this flag is "false", `WebhookEventService` still resolves to the
     * Postgres implementation. Phase 5A's webhook receiver framework
     * therefore requires `DATABASE_URL` populated even when the rest of
     * the dashboard is on Redis.
     */
    USE_POSTGRES_TRANSACTIONS: z
      .enum(["true", "false"])
      .optional()
      .default("false")
      .transform((v) => v === "true"),
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
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string(),
    /**
     * Widget Project URL for live preview
     * Points to the running nextjs-payment-widget project
     * Defaults to http://localhost:3000
     */
    NEXT_PUBLIC_WIDGET_PROJECT_URL: z
      .string()
      .url()
      .default("http://localhost:3000"),
    /**
     * Earn Project URL for live preview
     * Points to the running demo-earn-dashboard project
     * Defaults to http://localhost:3000
     */
    NEXT_PUBLIC_EARN_PROJECT_URL: z
      .string()
      .url()
      .default("http://localhost:3000"),
    /**
     * Wallet Project URL for live preview
     * Points to the running wallet demo project
     * Defaults to http://localhost:3000
     */
    NEXT_PUBLIC_WALLET_PROJECT_URL: z
      .string()
      .url()
      .default("http://localhost:3000"),
    /**
     * Remittance Project URL for live preview
     * Points to the running remittance demo project
     * Defaults to http://localhost:4004
     */
    NEXT_PUBLIC_REMITTANCE_PROJECT_URL: z
      .string()
      .url()
      .default("http://localhost:4004"),
    /**
     * Trade Project URL for live preview
     * Points to the running trade demo project
     * Defaults to http://localhost:4005
     */
    NEXT_PUBLIC_TRADE_PROJECT_URL: z
      .string()
      .url()
      .default("http://localhost:4005"),
    /**
     * Visa Direct Project URL for live preview
     * Points to the running visa-direct demo project
     * Defaults to http://localhost:4006
     */
    NEXT_PUBLIC_VISA_DIRECT_PROJECT_URL: z
      .string()
      .url()
      .default("http://localhost:4006"),
  },
  /*
   * Due to how Next.js bundles environment variables on Edge and Client,
   * we need to manually destructure them to make sure all are included in bundle.
   *
   * 💡 You'll get type errors if not all variables from `server` & `client` are included here.
   */
  runtimeEnv: {
    COINBASE_API_KEY: process.env.COINBASE_API_KEY,
    COINBASE_API_SECRET: process.env.COINBASE_API_SECRET,
    LIFI_API_KEY: process.env.LIFI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    REDIS_URL: process.env.REDIS_URL,
    NODE_ENV: process.env.NODE_ENV,
    QSTASH_TOKEN: process.env.QSTASH_TOKEN,
    QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY,
    QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY,
    APP_URL: process.env.APP_URL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    CRON_SECRET: process.env.CRON_SECRET,
    BLINDPAY_API_URL: process.env.BLINDPAY_API_URL,
    BLINDPAY_INSTANCE_ID: process.env.BLINDPAY_INSTANCE_ID,
    BLINDPAY_API_KEY: process.env.BLINDPAY_API_KEY,
    IRON_ENVIRONMENT: process.env.IRON_ENVIRONMENT,
    IRON_API_KEY: process.env.IRON_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    USE_POSTGRES_BRANDS: process.env.USE_POSTGRES_BRANDS,
    USE_POSTGRES_TRANSACTIONS: process.env.USE_POSTGRES_TRANSACTIONS,
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    NEXT_PUBLIC_WIDGET_PROJECT_URL: process.env.NEXT_PUBLIC_WIDGET_PROJECT_URL,
    NEXT_PUBLIC_EARN_PROJECT_URL: process.env.NEXT_PUBLIC_EARN_PROJECT_URL,
    NEXT_PUBLIC_WALLET_PROJECT_URL: process.env.NEXT_PUBLIC_WALLET_PROJECT_URL,
    NEXT_PUBLIC_REMITTANCE_PROJECT_URL:
      process.env.NEXT_PUBLIC_REMITTANCE_PROJECT_URL,
    NEXT_PUBLIC_TRADE_PROJECT_URL:
      process.env.NEXT_PUBLIC_TRADE_PROJECT_URL,
    NEXT_PUBLIC_VISA_DIRECT_PROJECT_URL:
      process.env.NEXT_PUBLIC_VISA_DIRECT_PROJECT_URL,
  },
});
