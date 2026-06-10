import type { ParsedFlowConfig } from "./schema";

/**
 * Three seeded scenarios that ship with the demo. Source / destination
 * / asset / amount choices are curated; an operator-customized URL
 * overlays its own values on top via the url-codec.
 */
export const DEFAULT_FLOW_CONFIGS = {
  checkout: {
    scenario: "checkout",
    source: { type: "external-wallet" },
    destination: { type: "fireblocks-vault" },
    asset: { symbol: "USDC", chain: "base" },
    amount: { mode: "fixed", fixedAmount: "5.00", fixedCurrency: "USD" },
    compliance: { sanctionsScreening: true, spamTokenFilter: true },
  },
  deposit: {
    scenario: "deposit",
    source: {
      type: "external-wallet",
      preferred: { walletProvider: "phantom" },
    },
    destination: { type: "embedded-wallet" },
    asset: { symbol: "USDC", chain: "base" },
    amount: {
      mode: "user-input",
      presets: [25, 50, 100, 250],
      minimums: { usd: 10 },
    },
    compliance: { sanctionsScreening: true, spamTokenFilter: true },
  },
  withdraw: {
    scenario: "withdraw",
    source: { type: "embedded-wallet" },
    destination: { type: "external-address" },
    // Platform wallet is anchored on USDC@Base — see
    // `app/withdraw/components/use-embedded-wallet-balances.ts` and
    // `app/withdraw/settlement-options.ts` USDC_ON_BASE. The
    // hero chip + Step 01 snippet read from this, so it has to
    // match what the live widget actually moves.
    asset: { symbol: "USDC", chain: "base" },
    amount: { mode: "user-input", presets: [50, 100, 500] },
    compliance: { sanctionsScreening: true, spamTokenFilter: true },
  },
} as const satisfies Record<
  "checkout" | "deposit" | "withdraw",
  ParsedFlowConfig
>;

/**
 * Stable scenario keys. Kept for legacy URL share-links from earlier
 * iterations; the consumer routes ignore unknown `?id=` values.
 */
export const FLOW_SEED_CONFIG_IDS = {
  checkout: "flow_seed_checkout",
  deposit: "flow_seed_deposit",
  withdraw: "flow_seed_withdraw",
} as const;
