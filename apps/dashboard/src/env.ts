import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Demo launch/preview links default to the public catalog entry
 * (src/lib/landing/demos.ts - the single source of truth for demo
 * URLs); NEXT_PUBLIC_DEMO_URL_OVERRIDES (JSON) supplies local-dev
 * overrides. Fallback covers demos without a catalog entry.
 */
export const env = createEnv({
  /*
   * Server side Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    COINBASE_API_KEY: z.string(),
    COINBASE_API_SECRET: z.string(),
    /**
     * Coinbase Onramp environment selector. Sandbox-by-default per D-005;
     * production opt-in requires the standard `[prod-creds]` PR flow.
     */
    COINBASE_API_ENVIRONMENT: z
      .enum(["sandbox", "production"])
      .default("sandbox"),
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
     * BlindPay webhook secret (Svix `whsec_...` form).
     * Required to verify incoming `/api/webhooks/blindpay` deliveries
     * (Phase 5A, D-011). When unset the receiver rejects every request
     * with 401 — failing closed is intentional so a misconfigured
     * deployment never silently accepts unsigned webhooks.
     */
    BLINDPAY_WEBHOOK_SECRET: z.string().optional(),
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
     * Fixed merchant Iron customer that receives ALL /kyc-deposit settlements
     * (one merchant, like paying a business). Must be a KYC-approved customer
     * in the connected Iron environment. Required to drive the demo offramp.
     */
    IRON_MERCHANT_CUSTOMER_ID: z.string().optional(),
    /**
     * Merchant's USD (ACH) settlement account. In sandbox these default to
     * public ACH test fixtures so the demo works out of the box; override for a
     * specific account. The merchant-offramp route auto-registers + approves
     * this account for the merchant customer.
     */
    IRON_MERCHANT_BANK_ROUTING_NUMBER: z
      .string()
      .optional()
      .default("021000021"),
    IRON_MERCHANT_BANK_ACCOUNT_NUMBER: z
      .string()
      .optional()
      .default("000123456789"),
    /**
     * Fiat currency the merchant offramp settles to. USDC → USD (≈1:1) by
     * default via ACH. Sandbox demo only.
     */
    IRON_MERCHANT_OFFRAMP_CURRENCY: z.string().optional().default("USD"),
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
     * Magic-send vault private key (sandbox).
     * 0x-prefixed hex string. Drives the custodial EOA that funds the
     * embedded wallet leg of magic-send (Phase 7). Sandbox per D-005;
     * a production-grade implementation will swap in a Fireblocks-
     * backed adapter in a follow-up PR.
     */
    MAGIC_SEND_VAULT_PRIVATE_KEY: z.string().optional(),
    /**
     * Magic-send vault chain id (sandbox).
     * Default 84532 (Base Sepolia). Coerced from string env var.
     */
    MAGIC_SEND_VAULT_CHAIN_ID: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : 84532))
      .pipe(z.number().int().positive()),
    /**
     * Magic-send vault RPC URL (sandbox).
     * Defaults to the public Base Sepolia RPC.
     */
    MAGIC_SEND_VAULT_RPC_URL: z
      .string()
      .url()
      .optional()
      .default("https://sepolia.base.org"),
    /**
     * Dynamic webhook signing secret. Used to verify `wallet.activity`
     * deliveries to /api/webhooks/dynamic (Phase 7). When unset the
     * receiver fails closed with 401 — never silently accept unsigned
     * webhooks.
     */
    DYNAMIC_WEBHOOK_SECRET: z.string().optional(),
    /**
     * Dynamic admin API bearer token (`dyn_...`). Server-only. Reserved for
     * admin API access (e.g. listing environment users); no runtime request
     * path reads it today. Sandbox-by-default per D-005.
     */
    DYNAMIC_API_TOKEN: z.string().optional(),
    /**
     * Internal API gating secret for /api/magic-send/intents/[id]/execute.
     * External callers cannot trigger userop dispatch — only the
     * dashboard's own webhook receiver may. Sent as the
     * `x-internal-api-secret` header.
     */
    INTERNAL_API_SECRET: z.string().optional(),
    /**
     * SumSub App Token for KYC verification.
     * Sandbox tokens start with `sbx:`. Sandbox-by-default (D-005).
     * Get from https://cockpit.sumsub.com/checkus#/devSpace/appTokens
     */
    SUMSUB_APP_TOKEN: z.string().optional(),
    /**
     * SumSub Secret Key paired with the app token.
     * Required alongside SUMSUB_APP_TOKEN.
     */
    SUMSUB_SECRET_KEY: z.string().optional(),
    /**
     * SumSub environment selector. Sandbox-by-default per D-005.
     */
    SUMSUB_ENVIRONMENT: z
      .enum(["sandbox", "production"])
      .optional()
      .default("sandbox"),
    /**
     * SumSub verification level name. MUST match a level that exists in the
     * connected SumSub account (Cockpit → Levels). Account-specific: if your
     * account doesn't have a level with this name, set this to your real level
     * name, otherwise applicant creation fails with `Level '…' not found`
     * (404). Default matches the demo SumSub account's `id-only` level
     * (ID document only).
     */
    SUMSUB_LEVEL_NAME: z.string().min(1).optional().default("id-only"),
    /**
     * GTM sign-in allowlist: comma-separated email domains permitted into the
     * operator surface (e.g. `fireblocks.com,dynamic.xyz`). Matching is on the
     * full domain after `@`, lowercased, exact. Empty (default) fails
     * closed - nobody passes. There is NO individual-email allowlist.
     */
    GTM_ALLOWED_DOMAINS: z.string().optional().default(""),
    /**
     * Pepper mixed into `sha256(ip + IP_HASH_SALT)` before persisting
     * `VisitorSession.ipHash` (Phase GTM-06). Raw IPs are never stored;
     * this salt just keeps the hash from being a trivial rainbow-table
     * lookup. Falls back to a fixed local-dev value for local runs; fails
     * closed at startup when `NEXT_PUBLIC_APP_ENV=production` and this is
     * unset (see the check below `createEnv` - the dev fallback is
     * committed to the repo, so a real deployment must never use it).
     */
    IP_HASH_SALT: z.string().optional().default("local-dev-ip-hash-salt"),
    /**
     * CORS allowlist for the public tracker-facing endpoints (`/s/[token]`'s
     * context call, Phase GTM-06's `/api/events`): comma-separated demo
     * origins (e.g. `https://wallet.dynamic.dev`). Empty (default) allows
     * no origin - the endpoints still respond, just without CORS headers.
     */
    TRACK_CORS_ORIGINS: z.string().optional().default(""),
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
     * Optional per-kind launch-URL overrides as JSON, e.g.
     * `{"earn":"http://localhost:4002","checkout":"http://localhost:3000"}`.
     * The demo catalog (src/lib/landing/demos.ts) is the canonical source of
     * base URLs; this var covers local dev servers and kinds without a
     * public domain yet. Invalid JSON is ignored.
     */
    NEXT_PUBLIC_DEMO_URL_OVERRIDES: z.string().optional().default("{}"),
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
    COINBASE_API_ENVIRONMENT: process.env.COINBASE_API_ENVIRONMENT,
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
    BLINDPAY_WEBHOOK_SECRET: process.env.BLINDPAY_WEBHOOK_SECRET,
    IRON_ENVIRONMENT: process.env.IRON_ENVIRONMENT,
    IRON_API_KEY: process.env.IRON_API_KEY,
    IRON_MERCHANT_CUSTOMER_ID: process.env.IRON_MERCHANT_CUSTOMER_ID,
    IRON_MERCHANT_BANK_ROUTING_NUMBER:
      process.env.IRON_MERCHANT_BANK_ROUTING_NUMBER,
    IRON_MERCHANT_BANK_ACCOUNT_NUMBER:
      process.env.IRON_MERCHANT_BANK_ACCOUNT_NUMBER,
    IRON_MERCHANT_OFFRAMP_CURRENCY: process.env.IRON_MERCHANT_OFFRAMP_CURRENCY,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    MAGIC_SEND_VAULT_PRIVATE_KEY: process.env.MAGIC_SEND_VAULT_PRIVATE_KEY,
    MAGIC_SEND_VAULT_CHAIN_ID: process.env.MAGIC_SEND_VAULT_CHAIN_ID,
    MAGIC_SEND_VAULT_RPC_URL: process.env.MAGIC_SEND_VAULT_RPC_URL,
    DYNAMIC_WEBHOOK_SECRET: process.env.DYNAMIC_WEBHOOK_SECRET,
    DYNAMIC_API_TOKEN: process.env.DYNAMIC_API_TOKEN,
    INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
    SUMSUB_APP_TOKEN: process.env.SUMSUB_APP_TOKEN,
    SUMSUB_SECRET_KEY: process.env.SUMSUB_SECRET_KEY,
    SUMSUB_ENVIRONMENT: process.env.SUMSUB_ENVIRONMENT,
    SUMSUB_LEVEL_NAME: process.env.SUMSUB_LEVEL_NAME,
    GTM_ALLOWED_DOMAINS: process.env.GTM_ALLOWED_DOMAINS,
    IP_HASH_SALT: process.env.IP_HASH_SALT,
    TRACK_CORS_ORIGINS: process.env.TRACK_CORS_ORIGINS,
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
    NEXT_PUBLIC_DEMO_URL_OVERRIDES:
      process.env.NEXT_PUBLIC_DEMO_URL_OVERRIDES,
  },
});

/**
 * I1 - IP_HASH_SALT must fail closed in production. The zod default above
 * is a fixed string committed to the repo; sha256(ip + known-salt) over
 * the ~4.3B IPv4 space is a trivial precompute, so using it in a deployed
 * environment would make VisitorSession.ipHash reversible - defeating the
 * "raw IP never recoverable" privacy invariant. Dev/test keep the
 * fallback (checked directly off process.env, not the parsed default, so
 * an explicit empty string doesn't slip through as "set").
 */
if (process.env.NEXT_PUBLIC_APP_ENV === "production" && !process.env.IP_HASH_SALT) {
  throw new Error(
    "IP_HASH_SALT is required when NEXT_PUBLIC_APP_ENV=production - refusing to start with the public dev-fallback salt (see src/env.ts).",
  );
}
