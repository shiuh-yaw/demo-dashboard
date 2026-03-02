/**
 * Component-Level Defaults
 *
 * Fallback values for individual components when config values are not provided.
 * These are only used as last-resort defaults.
 */

/**
 * Number of tokens to show initially before "Show more" button
 */
export const INITIAL_TOKENS_SHOWN = 5;

/**
 * Animation durations in milliseconds
 */
export const ANIMATION = {
  transitionDuration: 150,
};

/**
 * Default slippage buffer for swaps (3%)
 * Added to swap input to account for price movement
 */
export const DEFAULT_SLIPPAGE_BUFFER = 0.03;

/**
 * Chain Icons (Dynamic CDN)
 * Used for displaying chain logos in wallet/network selection.
 */
export const CHAIN_ICONS: Record<string, string> = {
  EVM: "https://app.dynamic.xyz/assets/networks/eth.svg",
  SOL: "https://app.dynamic.xyz/assets/networks/solana.svg",
};

/**
 * Popular Wallets
 * Shown when no browser wallets are detected, with install links.
 */
export const POPULAR_WALLETS = [
  {
    name: "MetaMask",
    iconUrl: "/images/metamask.svg",
    installUrl: "https://metamask.io/download/",
    chain: "EVM",
  },
  {
    name: "Coinbase Wallet",
    iconUrl: "/images/coinbase.svg",
    installUrl: "https://www.coinbase.com/wallet/downloads",
    chain: "EVM",
  },
  {
    name: "Phantom",
    iconUrl: "/images/phantom.png",
    installUrl: "https://phantom.app/download",
    chain: "SOL",
  },
] as const;

/**
 * Deposit Amount Defaults
 */
export const DEPOSIT_PRESETS = [50, 100, 500, 1000];
export const DEPOSIT_MIN_AMOUNT = 1;
export const DEPOSIT_MAX_AMOUNT = 10000;

/**
 * Native Token Address
 * LI.FI uses this address to represent native tokens (ETH, MATIC, etc.)
 */
export const NATIVE_TOKEN_ADDRESS =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

/**
 * ERC-20 Token ABIs
 * Common contract interfaces for token operations.
 */
export const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
