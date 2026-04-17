/**
 * Single source of truth for the chain Visa Direct operates on.
 *
 * Fireblocks pushes to Ethereum Sepolia (USDC_ETH_TEST5_0GER) and
 * our mock payouts / onramps assume the same. We intentionally DO
 * NOT trust whatever network the Dynamic provider reports as active
 * — the Dynamic environment may only have Ethereum mainnet enabled,
 * in which case its `NetworkData` would point at mainnet's RPC URL
 * and the wallet would silently look empty.
 *
 * Instead we hardcode Sepolia's chain id, display name, RPC URL,
 * and explorer here. Balance reads, labels, and transaction links
 * all source from this — independent of the Dynamic network list.
 */
import { sepolia } from "viem/chains";

export const REQUIRED_CHAIN_ID = 11155111;
export const REQUIRED_NETWORK_ID = String(REQUIRED_CHAIN_ID);

/**
 * Public Sepolia RPC + metadata used for read-only calls (balance
 * reads, explorer links, chain labels). Defaults to viem's built-in
 * sepolia RPC so we're not blocked on Dynamic dashboard config.
 */
export const SEPOLIA_NETWORK = {
  chainId: sepolia.id,
  networkId: String(sepolia.id),
  displayName: sepolia.name,
  rpcUrl: sepolia.rpcUrls.default.http[0],
  blockExplorerUrl: sepolia.blockExplorers.default.url,
  viemChain: sepolia,
} as const;

/**
 * Static USDC contract addresses per chain.
 *
 * The underlying network selection is owned by the Dynamic SDK for
 * signing flows, but this map is the canonical source of the USDC
 * contract once we know the chain id.
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
  // Base Sepolia — Dynamic demo USDC
  84532: "0x678d798938bd326d76e5db814457841d055560d0",
};

export function getUsdcAddress(chainId: number): `0x${string}` | null {
  return USDC_ADDRESSES[chainId] ?? null;
}
