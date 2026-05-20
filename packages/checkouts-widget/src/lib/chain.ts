/** Dynamic's network id for Solana — bare chain id, not CAIP-2. */
export const DYNAMIC_SOLANA_NETWORK_ID = 101;

export function isSolanaChainId(chainId: number): boolean {
  return chainId === DYNAMIC_SOLANA_NETWORK_ID;
}
