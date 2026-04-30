/**
 * Static USDC contract addresses per chain.
 * Network selection is handled by Dynamic SDK — this is only used
 * to resolve the ERC-20 contract address for transfers.
 */

const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  // Ethereum Mainnet
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  // Ethereum Sepolia
  11155111: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  // Polygon Mainnet
  137: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  // Polygon Amoy
  80002: "0x8B0180f2101c8260d49339abfEe87927412494B4",
  // Base Sepolia — Dynamic demo USDC (mintable for on-chain payout demo)
  84532: "0x678d798938bd326d76e5db814457841d055560d0",
};

export function getUsdcAddress(chainId: number): `0x${string}` | null {
  return USDC_ADDRESSES[chainId] ?? null;
}
