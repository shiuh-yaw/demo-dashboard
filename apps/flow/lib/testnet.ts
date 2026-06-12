/**
 * Testnet chain identifiers and helpers for the Flow demo.
 *
 * LI.FI Intents support cross-chain USDC routing on these testnet
 * chains. The production API (`li.quest/v1`) works for testnets;
 * the testnet order server is `order-dev.li.fi`.
 *
 * Best pair: Base Sepolia ↔ Arbitrum Sepolia (up to 20 USDC).
 */

/** EVM testnet chain IDs with confirmed LI.FI liquidity. */
export const TESTNET_CHAIN_IDS = new Set([
  84532, // Base Sepolia
  421614, // Arbitrum Sepolia
  11155420, // OP Sepolia
  11155111, // Ethereum Sepolia
]);

/** Returns `true` if the given chainId belongs to a known testnet. */
export function isTestnetChainId(chainId: number): boolean {
  return TESTNET_CHAIN_IDS.has(chainId);
}

/**
 * Symbols routable on testnets via LI.FI Intents.
 * Currently only USDC has liquidity on any testnet pair.
 */
const TESTNET_SUPPORTED_SYMBOLS = new Set(["USDC"]);

/**
 * Returns `true` if a token is usable in testnet mode:
 * must be USDC on one of the supported testnet chains.
 */
export function isTestnetSupportedToken(
  chainId: number,
  symbol: string,
): boolean {
  return TESTNET_CHAIN_IDS.has(chainId) && TESTNET_SUPPORTED_SYMBOLS.has(symbol.toUpperCase());
}
