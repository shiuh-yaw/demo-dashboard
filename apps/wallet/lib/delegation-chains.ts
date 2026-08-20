/**
 * Which chains delegated signing covers, and the one translation it needs.
 *
 * Two vocabularies meet here: the client SDK calls Solana wallet accounts
 * "SOL", while the wallet servers and `@dynamic-labs-wallet/node-svm` call the
 * same chain "SVM". Both reach this module - the browser via the settings row,
 * the server via the webhook's stored `chain` - so both spellings resolve to
 * one family and neither side has to know about the other.
 *
 * Neutral module: no React, no SDK imports, so it is unit-testable in node.
 */

/** The delegated signer packages: `node-evm` and `node-svm`. */
export type DelegatedChainFamily = "EVM" | "SVM";

/** Null for a chain no delegated signer ships for, which callers must reject. */
export function delegatedChainFamily(
  chain: string | null | undefined,
): DelegatedChainFamily | null {
  switch (chain?.toUpperCase()) {
    case "EVM":
      return "EVM";
    case "SVM":
    case "SOL":
      return "SVM";
    default:
      return null;
  }
}

export function isDelegatableChain(chain: string | null | undefined): boolean {
  return delegatedChainFamily(chain) !== null;
}
