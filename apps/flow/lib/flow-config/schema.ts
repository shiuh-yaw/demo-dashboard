import { z } from "zod";

/**
 * Canonical Zod schema for a Flow demo configuration.
 *
 * This schema is the SOURCE OF TRUTH for:
 *   - The dashboard's `DemoConfig` flow-kind payload (Postgres `config`).
 *   - The builder UI's form validation.
 *   - The Anthropic system prompt's JSON-schema constraint (chat-to-flow
 *     emits JSON that this parses).
 *   - The TS / cURL / Droplet code-snippet generators.
 *
 * Keep this aligned with `FlowConfig` in
 * `apps/dashboard/src/lib/types/dashboard.ts`. The TS type is hand-written
 * (not `z.infer`) because the dashboard package is a separate workspace
 * and importing the Zod schema there would create a cycle.
 */

export const FLOW_SCENARIOS = ["checkout", "deposit", "withdraw", "kyc-deposit"] as const;

export const FLOW_SOURCE_TYPES = [
  "external-wallet",
  "exchange",
  "embedded-wallet",
  "fireblocks-vault",
] as const;

export const FLOW_DESTINATION_TYPES = [
  "fireblocks-vault",
  "embedded-wallet",
  "external-address",
] as const;

export const FLOW_EXCHANGES = ["coinbase", "kraken", "crypto-com"] as const;

/**
 * Supported asset+chain pairs surfaced in the builder. Flow's underlying
 * SDK supports more — this is the curated list the demo shows. Extending
 * is a one-line edit.
 */
export const FLOW_CHAINS = [
  "base",
  "ethereum",
  "polygon",
  "arbitrum",
  "optimism",
  "solana",
] as const;

export const FLOW_ASSETS = [
  "USDC",
  "USDT",
  "USDP",
  "PYUSD",
  "ETH",
  "SOL",
  "BTC",
] as const;

export const flowScenarioSchema = z.enum(FLOW_SCENARIOS);

export const flowSourceSchema = z.object({
  type: z.enum(FLOW_SOURCE_TYPES),
  preferred: z
    .object({
      walletProvider: z.string().optional(),
      exchange: z.enum(FLOW_EXCHANGES).optional(),
    })
    .optional(),
});

export const flowDestinationSchema = z.object({
  type: z.enum(FLOW_DESTINATION_TYPES),
  vaultAccountId: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
});

export const flowAssetSchema = z.object({
  symbol: z.string().min(1),
  chain: z.string().min(1),
});

export const flowAmountSchema = z.object({
  mode: z.enum(["fixed", "user-input"]),
  fixedAmount: z.string().optional(),
  fixedCurrency: z.string().optional(),
  minimums: z.object({ usd: z.number().nonnegative().optional() }).optional(),
  presets: z.array(z.number().positive()).optional(),
});

export const flowComplianceSchema = z.object({
  sanctionsScreening: z.boolean(),
  spamTokenFilter: z.boolean(),
  geographicBlocks: z.array(z.string().length(2).toUpperCase()).optional(),
});

export const flowConfigSchema = z.object({
  scenario: flowScenarioSchema,
  source: flowSourceSchema,
  destination: flowDestinationSchema,
  asset: flowAssetSchema,
  amount: flowAmountSchema,
  compliance: flowComplianceSchema,
});

/**
 * Parse an unknown payload into a validated FlowConfig. Throws ZodError
 * on shape violations; callers translate to user-facing messages.
 */
export function parseFlowConfig(input: unknown) {
  return flowConfigSchema.parse(input);
}

/**
 * Type alias mirroring `FlowConfig` in
 * `apps/dashboard/src/lib/types/dashboard.ts`. Re-derived here so this
 * file is consumable without a dashboard import.
 */
export type ParsedFlowConfig = z.infer<typeof flowConfigSchema>;
