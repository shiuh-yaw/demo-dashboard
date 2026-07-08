/**
 * Canonical "native token" address marker for EVM chains. Per Dynamic's
 * SDK (`getSwapQuote.d.ts` line 26) the zero address is the native-token
 * sentinel for EVM chains in Checkout / Swap APIs.
 *
 * Do NOT use for Solana native SOL — use SOLANA_NATIVE_MINT instead.
 */
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * The wrapped-native SOL SPL mint address. This is what Dynamic's routing
 * layer expects as the native-token identifier for Solana — the system
 * program has no SPL address, so the wrapped mint is the canonical marker.
 *
 * Distinct from ZERO_ADDRESS: the quote endpoint treats them differently
 * and will return 404 / "no quotes available" if given the EVM zero address
 * for a Solana source token.
 */
export const SOLANA_NATIVE_MINT = "So11111111111111111111111111111111111111112";

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
