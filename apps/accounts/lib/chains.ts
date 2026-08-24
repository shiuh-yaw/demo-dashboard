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

/**
 * What an address looks like on each chain, for a field the user types one
 * into.
 *
 * A hex hint only where it holds on every network of that chain; the chain's
 * own name everywhere else, because Bitcoin and TON spell an address
 * differently across networks and address versions, and a placeholder that
 * shows the wrong prefix is worse than one that shows none.
 */
const ADDRESS_PLACEHOLDERS: Record<WalletChain, string> = {
  EVM: "0x...",
  SUI: "0x...",
  SOL: "Solana address",
  BTC: "Bitcoin address",
  TON: "TON address",
};

export function addressPlaceholderFor(chain: string): string {
  return ADDRESS_PLACEHOLDERS[chain as WalletChain] ?? "Address";
}
