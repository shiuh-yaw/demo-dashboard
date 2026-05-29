/**
 * Canonical "native token" address marker. Per Dynamic's SDK
 * (`getSwapQuote.d.ts` line 26: "Use zero address for EVM and SOL
 * native tokens.") the zero EVM address doubles as the native-token
 * sentinel on both EVM and Solana chains in Checkout / Swap APIs.
 *
 * Use this rather than the literal string so it's grep-able and
 * intent is obvious at call sites.
 */
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/** Dynamic's network id for Solana — bare chain id, not CAIP-2. */
export const DYNAMIC_SOLANA_NETWORK_ID = 101;

/**
 * Dynamic's API-layer Solana mainnet chain id. The SDK normalizes
 * Solana to this large numeric form when round-tripping through
 * `getMultichainBalances` and the Checkout transaction APIs, so a
 * token picked from a SOL balance can land in `fromToken.chainId`
 * as either `101` (widget surface) or `1151111081099710` (SDK
 * surface) depending on the path it took.
 *
 * Confirmed in dynamic-sdk's
 * `packages/client/src/modules/checkout/attachCheckoutTransactionSource`
 * test fixtures.
 */
export const DYNAMIC_SOLANA_API_CHAIN_ID = 1151111081099710;

/**
 * True for any Solana-mainnet chain-id representation Dynamic's
 * SDK might surface. Defensive against both the widget-local `101`
 * and the API-layer `1151111081099710` — callers shouldn't have to
 * care which one they got.
 */
export function isSolanaChainId(chainId: number): boolean {
  return (
    chainId === DYNAMIC_SOLANA_NETWORK_ID ||
    chainId === DYNAMIC_SOLANA_API_CHAIN_ID
  );
}
