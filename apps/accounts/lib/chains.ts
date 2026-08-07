import type { Chain } from "@/lib/dynamic";

/**
 * Chains this demo can mint a business-account wallet on.
 *
 * Must stay a subset of the extensions registered in `lib/dynamic/client.ts`:
 * `createWalletForBusinessAccount` resolves the WaaS provider by chain, so a
 * chain listed here without its extension throws at call time.
 *
 * The list is intersected with the environment's enabled networks at render
 * (`hooks/use-chain-options.ts`), so a chain here that the environment has not
 * enabled simply does not appear - this is a ceiling, not a promise.
 */
export const WALLET_CHAINS = [
  "EVM",
  "SOL",
  "BTC",
  "SUI",
  "TON",
] as const satisfies readonly Chain[];

export type WalletChain = (typeof WALLET_CHAINS)[number];

export const CHAIN_LABELS: Record<WalletChain, string> = {
  EVM: "EVM",
  SOL: "Solana",
  BTC: "Bitcoin",
  SUI: "Sui",
  TON: "TON",
};
