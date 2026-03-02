"use client";

/**
 * Dynamic Client - Centralized SDK Integration Layer
 *
 * This module provides a singleton-based, SSR-safe interface for the Dynamic SDK.
 * All SDK interactions should go through this module to ensure:
 *
 * 1. **SSR Safety**: All functions check for browser environment before calling SDK
 * 2. **Singleton Pattern**: Single client instance prevents duplicate connections
 * 3. **Type Safety**: Re-exports necessary types for consumers
 * 4. **Extensibility**: Centralized place to add new wallet/chain support
 *
 * ## Architecture
 *
 * - Core SDK wrappers: logout, isSignedIn, getPrimaryWalletAccount, etc.
 * - Wallet management: getWalletAccounts, selectPrimaryWalletAccount, removeWalletAccount
 * - Embedded (WaaS) wallets: ensureEmbeddedWallet, isEmbeddedWallet, getEmbeddedWalletAddress
 * - Display helpers: getWalletDisplayInfo, DYNAMIC_ICON_URL
 *
 * @example
 * ```tsx
 * import { isSignedIn, getPrimaryWalletAccount, isEmbeddedWallet } from "@/lib/dynamicClient";
 *
 * if (isSignedIn()) {
 *   const wallet = getPrimaryWalletAccount();
 *   if (wallet && !isEmbeddedWallet(wallet)) {
 *     // External wallet connected
 *   }
 * }
 * ```
 */

// =============================================================================
// IMPORTS
// =============================================================================

import {
  createDynamicClient,
  type DynamicClient,
  type DynamicInitStatus,
  type WalletAccount,
  type WalletProviderData,
  type Chain,
  logout as sdkLogout,
  getPrimaryWalletAccount as sdkGetPrimaryWalletAccount,
  switchActiveNetwork as sdkSwitchActiveNetwork,
  getActiveNetworkId as sdkGetActiveNetworkId,
  getAvailableWalletProvidersData as sdkGetAvailableWalletProvidersData,
  connectAndVerifyWithWalletProvider as sdkConnectAndVerifyWithWalletProvider,
  onEvent as sdkOnEvent,
  isSignedIn as sdkIsSignedIn,
  getMultichainBalances as sdkGetMultichainBalances,
  getNetworksData as sdkGetNetworksData,
  getWalletAccounts as sdkGetWalletAccounts,
  selectPrimaryWalletAccount as sdkSelectPrimaryWalletAccount,
  removeWalletAccount as sdkRemoveWalletAccount,
  waitForClientInitialized as sdkWaitForClientInitialized,
  sendEmailOTP as sdkSendEmailOTP,
  verifyOTP as sdkVerifyOTP,
  type OTPVerification,
  type VerifyResponse,
  // Exchange / Social OAuth
  authenticateWithSocial as sdkAuthenticateWithSocial,
  completeSocialAuthentication as sdkCompleteSocialAuthentication,
  detectOAuthRedirect as sdkDetectOAuthRedirect,
  getUserSocialAccounts as sdkGetUserSocialAccounts,
  // Kraken funding
  getKrakenAccounts as sdkGetKrakenAccounts,
  getKrakenWhitelistedAddresses as sdkGetKrakenWhitelistedAddresses,
  createKrakenExchangeTransfer as sdkCreateKrakenExchangeTransfer,
  type KrakenAccount,
  type KrakenTransferRequest,
  type ExchangeTransferResponse,
  type TransferDestinationResponse,
  type GetKrakenAccountsParams,
} from "@dynamic-labs-sdk/client";
import {
  createWaasWalletAccounts as sdkCreateWaasWalletAccounts,
  getChainsMissingWaasWalletAccounts as sdkGetChainsMissingWaasWalletAccounts,
  isWaasWalletAccount,
} from "@dynamic-labs-sdk/client/waas";
import {
  addEvmExtension,
  isEvmWalletAccount,
  type EvmWalletAccount,
} from "@dynamic-labs-sdk/evm";
import {
  addWalletConnectEvmExtension,
  connectAndVerifyWithWalletConnectEvm as sdkConnectAndVerifyWithWalletConnectEvm,
} from "@dynamic-labs-sdk/evm/wallet-connect";
import {
  addSolanaExtension,
  getSolanaConnection as sdkGetSolanaConnection,
  isSolanaWalletAccount,
  type SolanaWalletAccount,
} from "@dynamic-labs-sdk/solana";
// NOTE: @dynamic-labs-sdk/solana/wallet-connect types exist but runtime files
// are not shipped in v0.6.0. Solana WalletConnect support can be enabled once
// the SDK ships the runtime bundle.
import {
  getWalletConnectCatalog as sdkGetWalletConnectCatalog,
  type WalletConnectCatalog,
  type WalletConnectCatalogWallet,
} from "@dynamic-labs-sdk/client";
import { getActiveNetworkData as sdkGetActiveNetworkData } from "@dynamic-labs-sdk/client";
import { env } from "./env";

// =============================================================================
// TYPES & CONSTANTS
// =============================================================================

// Dynamic logo mark as inline SVG data URL for embedded wallet icon
// Uses a square viewBox with the logo centered for consistent sizing in wallet icon containers
export const DYNAMIC_ICON_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-1 -2 24 24' fill='%230050FF'%3E%3Cpath d='M9.9 1.5c-.43.4-.85.79-1.27 1.18C6.67 4.5 4.71 6.32 2.75 8.14c-.45.41-.92.81-1.48 1.06-.67.29-1.06.1-1.27-.62-.3-1.01-.14-1.95.44-2.82.5-.74 1.12-1.36 1.76-1.96 1.02-.96 2.05-1.9 3.1-2.83.46-.41.96-.78 1.57-.9C8.69-.31 9.85 1.44 9.9 1.5z'/%3E%3Cpath d='M1.1 10.75c1.11-.32 1.95-1.02 2.76-1.77 2.59-2.36 5.18-4.73 7.78-7.08.57-.52 1.18-1.01 1.81-1.45.81-.55 1.7-.63 2.57-.1.31.19.62.41.88.67.88.92 1.76 1.85 2.61 2.8.91 1 1.8 2.03 2.67 3.07.3.36.54.77.74 1.2.38.78.28 1.56-.18 2.29-.4.65-.95 1.19-1.52 1.7-2.21 2-4.42 3.99-6.65 5.96-.6.53-1.26 1-1.94 1.42-1.28.79-2.57.69-3.74-.24-.68-.55-1.32-1.16-1.9-1.8C5.06 15.34 3.21 13.23 1.4 11.1c-.1-.1-.18-.22-.3-.36z'/%3E%3C/svg%3E";

export const environmentId = env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

// Singleton state
let _client: DynamicClient | null = null;

/**
 * Add wallet extensions to the client.
 *
 * In 0.6.0, addEvmExtension already includes EIP-6963 support (MetaMask, Coinbase Wallet, etc.)
 * and addSolanaExtension already includes Wallet Standard support (Phantom, Solflare, etc.)
 * WalletConnect is added eagerly (async, fire-and-forget) — the SDK handles readiness internally.
 */
const addExtensions = (client: DynamicClient) => {
  addEvmExtension(client);
  addSolanaExtension(client);
  void addWalletConnectEvmExtension(client);
  // TODO: Add addWalletConnectSolanaExtension once SDK v0.6.x ships the runtime
};

/**
 * Gets or creates the Dynamic client instance (singleton pattern)
 */
const getClient = (): DynamicClient | null => {
  // SSR guard - return null to prevent hydration mismatches
  if (typeof window === "undefined") return null;

  // Create client on first access
  if (!_client) {
    _client = createDynamicClient({
      environmentId,
      autoInitialize: true,
      metadata: {
        name: "Payment Widget",
        universalLink: window.location.origin,
      },
    });

    // Add sync extensions immediately after client creation
    addExtensions(_client);
  }

  return _client;
};

/**
 * SSR-safe wrappers for Dynamic SDK functions
 * These ensure the client is initialized before calling the SDK functions
 */

export const logout = (): Promise<void> => {
  const client = getClient();
  if (!client) return Promise.resolve();
  return sdkLogout();
};

export const getPrimaryWalletAccount = (): WalletAccount | null => {
  const client = getClient();
  if (!client) return null;
  try {
    return sdkGetPrimaryWalletAccount();
  } catch {
    return null;
  }
};

export const switchActiveNetwork = async (params: {
  walletAccount: WalletAccount;
  networkId: string;
}): Promise<void> => {
  const client = getClient();
  if (!client) return;
  return sdkSwitchActiveNetwork(params);
};

export const getActiveNetworkId = async (params: {
  walletAccount: WalletAccount;
}): Promise<{ networkId: string }> => {
  const client = getClient();
  if (!client) return { networkId: "" };
  return sdkGetActiveNetworkId(params);
};

export const getAvailableWalletProvidersData = (): WalletProviderData[] => {
  const client = getClient();
  if (!client) return [];
  try {
    return sdkGetAvailableWalletProvidersData() || [];
  } catch {
    return [];
  }
};

export const connectAndVerifyWithWalletProvider = async (params: {
  walletProviderKey: string;
}) => {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return sdkConnectAndVerifyWithWalletProvider(params);
};

type EventParams = Parameters<typeof sdkOnEvent>[0];

export const onEvent = (params: EventParams): (() => void) => {
  const client = getClient();
  if (!client) return () => {};
  try {
    return sdkOnEvent(params) || (() => {});
  } catch {
    return () => {};
  }
};

export const isSignedIn = (): boolean => {
  const client = getClient();
  if (!client) return false;
  try {
    return sdkIsSignedIn();
  } catch {
    return false;
  }
};

export const getMultichainBalances = async (
  ...args: Parameters<typeof sdkGetMultichainBalances>
) => {
  const client = getClient();
  if (!client) return { balances: [] };
  return sdkGetMultichainBalances(...args);
};

export const getNetworksData = () => {
  const client = getClient();
  if (!client) return [];
  try {
    return sdkGetNetworksData() || [];
  } catch {
    return [];
  }
};

export const getWalletAccounts = (): WalletAccount[] => {
  const client = getClient();
  if (!client) return [];
  try {
    return sdkGetWalletAccounts() || [];
  } catch {
    return [];
  }
};

export const selectPrimaryWalletAccount = async (params: {
  walletAccount: WalletAccount;
}): Promise<void> => {
  const client = getClient();
  if (!client) return;
  return sdkSelectPrimaryWalletAccount(params);
};

export const removeWalletAccount = async (params: {
  walletAccount: WalletAccount;
}): Promise<void> => {
  const client = getClient();
  if (!client) return;
  return sdkRemoveWalletAccount(params);
};

export const connectAndVerifyWithWalletConnectEvm = async () => {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return sdkConnectAndVerifyWithWalletConnectEvm();
};

// TODO: Enable once SDK ships Solana WC runtime (walletConnect entry missing from tsdown.config.ts)
// export const connectAndVerifyWithWalletConnectSolana = async () => {
//   const client = getClient();
//   if (!client) throw new Error("Dynamic client not initialized");
//   return sdkConnectAndVerifyWithWalletConnectSolana();
// };

export const getWalletConnectCatalog =
  async (): Promise<WalletConnectCatalog> => {
    const client = getClient();
    if (!client) throw new Error("Dynamic client not initialized");
    return sdkGetWalletConnectCatalog(client);
  };

// Re-export catalog types for consumers
export type { WalletConnectCatalog, WalletConnectCatalogWallet };

/**
 * Get the current initialization status of the Dynamic client
 * @returns 'uninitialized' | 'in-progress' | 'finished' | 'failed'
 */
export const getInitStatus = (): DynamicInitStatus => {
  const client = getClient();
  if (!client) return "uninitialized";
  return client.initStatus;
};

/**
 * Wait for the Dynamic client to be fully initialized
 * Returns a promise that resolves when the client is ready
 */
export const waitForClientInitialized = async (): Promise<void> => {
  const client = getClient();
  if (!client) return;
  return sdkWaitForClientInitialized(client);
};

// =============================================================================
// EMBEDDED WALLET (WaaS) FUNCTIONS
// =============================================================================

/**
 * Get chains that are missing WaaS wallet accounts
 * @returns Array of chain identifiers (e.g., ['EVM', 'SOL'])
 */
export const getChainsMissingWaasWalletAccounts = (): Chain[] => {
  const client = getClient();
  if (!client) return [];
  try {
    return sdkGetChainsMissingWaasWalletAccounts() as Chain[];
  } catch {
    return [];
  }
};

/**
 * Create WaaS wallet accounts for specified chains
 * @param chains - Array of chain identifiers (e.g., ['EVM', 'SOL'])
 */
export const createWaasWalletAccounts = async (params: {
  chains: Chain[];
}): Promise<void> => {
  const client = getClient();
  if (!client) return;
  return sdkCreateWaasWalletAccounts({ chains: params.chains });
};

/**
 * Check if a wallet is an embedded (WaaS) wallet
 */
export const isEmbeddedWallet = (wallet: WalletAccount): boolean => {
  const client = getClient();
  if (!client) return false;
  return isWaasWalletAccount({ walletAccount: wallet });
};

/**
 * Ensure embedded wallet exists for the specified chain, creating if needed.
 * IMPORTANT: Preserves the current primary wallet - does not switch primary.
 * @param chain - Chain identifier (e.g., 'EVM')
 * @returns The embedded wallet account for the chain, or null if not available
 */
export const ensureEmbeddedWallet = async (
  chain: Chain,
): Promise<WalletAccount | null> => {
  const client = getClient();
  if (!client) return null;

  try {
    // Save the current primary wallet before any changes
    const originalPrimaryWallet = sdkGetPrimaryWalletAccount();

    // Check if we need to create wallet for this chain
    const missingChains = sdkGetChainsMissingWaasWalletAccounts() as Chain[];
    if (missingChains.includes(chain)) {
      await sdkCreateWaasWalletAccounts({ chains: [chain] });

      // Restore the original primary wallet (createWaasWalletAccounts may switch it)
      if (originalPrimaryWallet) {
        await sdkSelectPrimaryWalletAccount({
          walletAccount: originalPrimaryWallet,
        });
      }
    }

    // Find and return the embedded wallet for this chain
    const wallets = sdkGetWalletAccounts();
    const embeddedWallet = wallets.find(
      (w) => w.chain === chain && isEmbeddedWallet(w),
    );

    return embeddedWallet || null;
  } catch (error) {
    console.error("Failed to ensure embedded wallet:", error);
    return null;
  }
};

/**
 * Get the embedded wallet address for a specific chain
 * @param chain - Chain identifier (e.g., 'EVM')
 * @returns The wallet address or null if not found
 */
export const getEmbeddedWalletAddress = (chain: Chain): string | null => {
  const client = getClient();
  if (!client) return null;

  try {
    const wallets = sdkGetWalletAccounts();
    const embeddedWallet = wallets.find(
      (w) => w.chain === chain && isEmbeddedWallet(w),
    );

    return embeddedWallet?.address || null;
  } catch {
    return null;
  }
};

// =============================================================================
// WALLET DISPLAY HELPERS
// =============================================================================

/**
 * Get wallet display info by looking up in available providers or parsing the key
 */
export function getWalletDisplayInfo(walletProviderKey?: string): {
  name: string;
  iconUrl?: string;
} {
  if (!walletProviderKey) return { name: "Wallet" };

  // Try to find matching provider from Dynamic SDK
  const providers = sdkGetAvailableWalletProvidersData() || [];

  // Try exact match first
  let provider = providers.find((p) => p.key === walletProviderKey);

  // Try matching by groupKey (e.g., "metamask" matches "metamaskevm")
  if (!provider) {
    provider = providers.find((p) =>
      walletProviderKey
        .toLowerCase()
        .includes(p.groupKey?.toLowerCase() || "___"),
    );
  }

  // Try partial match on key
  if (!provider) {
    const keyLower = walletProviderKey.toLowerCase();
    provider = providers.find((p) =>
      keyLower.includes(p.key.toLowerCase().replace(/(evm|sol)$/, "")),
    );
  }

  if (provider?.metadata) {
    return {
      name: provider.metadata.displayName || "Wallet",
      iconUrl: provider.metadata.icon,
    };
  }

  // Fallback: parse the key for embedded/walletconnect
  const keyLower = walletProviderKey.toLowerCase();
  if (keyLower.includes("embedded") || keyLower.includes("waas")) {
    return {
      name: "Embedded Wallet",
      iconUrl: DYNAMIC_ICON_URL,
    };
  }
  if (keyLower.includes("walletconnect")) {
    return { name: "WalletConnect" };
  }

  return { name: "Wallet" };
}

// =============================================================================
// WALLET CHAIN UTILITIES
// =============================================================================

/**
 * Get the chain type from a wallet account.
 * Returns the chain identifier used by Dynamic SDK ("EVM", "SOL", etc.)
 *
 * @param wallet - Wallet account from Dynamic SDK
 * @returns Chain identifier or null if not determinable
 */
export function getWalletChain(wallet: WalletAccount): Chain | null {
  if (wallet.chain === "EVM" || wallet.chain === "SOL") return wallet.chain;
  return null;
}

/**
 * Get enabled network IDs for a given chain type.
 * Reads from Dynamic's configured networks.
 *
 * @param chain - Chain identifier ("EVM" or "SOL")
 * @returns Array of network IDs (e.g., [1, 137, 8453] for EVM)
 *
 * @example
 * ```tsx
 * const wallet = getPrimaryWalletAccount();
 * const chain = getWalletChain(wallet);
 * if (chain) {
 *   const networkIds = getEnabledNetworkIds(chain);
 *   const balances = await getMultichainBalances({ ... networkIds ... });
 * }
 * ```
 */
export function getEnabledNetworkIds(chain: Chain): number[] {
  try {
    const allNetworks = sdkGetNetworksData() as unknown as Array<{
      chain?: string;
      networkId?: number | string;
      id?: number | string;
    }>;

    if (!allNetworks?.length) return [];

    return allNetworks
      .filter((n) => n.chain === chain)
      .map((n) => {
        const id = n.networkId ?? n.id;
        return typeof id === "number" ? id : parseInt(String(id), 10);
      })
      .filter((id) => !isNaN(id));
  } catch (error) {
    console.error("[dynamicClient] getEnabledNetworkIds error:", error);
    return [];
  }
}

/**
 * Build a balance request payload for a wallet.
 * Convenience function that combines getWalletChain and getEnabledNetworkIds.
 *
 * @param wallet - Wallet account to build request for
 * @returns Balance request payload or null if wallet chain not supported
 */
export function buildBalanceRequest(wallet: WalletAccount): {
  address: string;
  chain: Chain;
  networkIds: number[];
} | null {
  if (!wallet.address) return null;

  const chain = getWalletChain(wallet);
  if (!chain) return null;

  const networkIds = getEnabledNetworkIds(chain);
  if (!networkIds.length) return null;

  return {
    address: wallet.address,
    chain,
    networkIds,
  };
}

// =============================================================================
// WALLET VALIDATION
// =============================================================================

/**
 * Get the primary EVM wallet, throwing if not available.
 * Use this when an EVM wallet is required for an operation.
 *
 * @throws Error if no wallet is connected or if wallet is not EVM
 * @returns The primary EVM wallet account (type-narrowed)
 *
 * @example
 * ```tsx
 * try {
 *   const wallet = requireEvmWallet();
 *   const client = await createWalletClient({ walletAccount: wallet });
 * } catch (err) {
 *   setError(err.message); // "No wallet connected" or "Only EVM wallets supported"
 * }
 * ```
 */
export function requireEvmWallet(): EvmWallet {
  const wallet = sdkGetPrimaryWalletAccount();
  if (!wallet?.address) throw new Error("No wallet connected.");

  if (!isEvmWallet(wallet)) {
    throw new Error("Only EVM wallets are supported.");
  }

  // Type-safe: isEvmWallet is a type guard
  return wallet;
}

// =============================================================================
// SOLANA WALLET UTILITIES
// =============================================================================

/**
 * Check if a wallet is a Solana wallet.
 * Uses the official Dynamic SDK helper method
 * @param wallet - Wallet account to check
 * @returns True if wallet is on Solana chain
 */
export function isSolanaWallet(wallet: WalletAccount): wallet is SolanaWallet {
  return isSolanaWalletAccount(wallet);
}

/**
 * Check if a wallet is an EVM wallet.
 * Uses the official Dynamic SDK helper method
 * @param wallet - Wallet account to check
 * @returns True if wallet is on EVM chain
 */
export function isEvmWallet(wallet: WalletAccount): wallet is EvmWallet {
  return isEvmWalletAccount(wallet);
}

/**
 * Get the first connected Solana wallet.
 * @returns The Solana wallet account or null if none connected
 */
export function getSolanaWalletAccount(): SolanaWallet | null {
  const client = getClient();
  if (!client) return null;

  try {
    const wallets = sdkGetWalletAccounts();
    const solanaWallet = wallets.find((w) => isSolanaWallet(w));
    return solanaWallet || null;
  } catch {
    return null;
  }
}

/**
 * Get the primary Solana wallet, throwing if not available.
 * Use this when a Solana wallet is required for an operation.
 *
 * @throws Error if no Solana wallet is connected
 * @returns The Solana wallet account (type-narrowed)
 *
 * @example
 * ```tsx
 * try {
 *   const wallet = requireSolanaWallet();
 *   const connection = await getSolanaConnection(wallet);
 * } catch (err) {
 *   setError(err.message); // "No Solana wallet connected"
 * }
 * ```
 */
export function requireSolanaWallet(): SolanaWallet {
  const wallet = getSolanaWalletAccount();

  if (!wallet?.address) throw new Error("No Solana wallet connected.");
  return wallet;
}

/**
 * Get a Solana connection for a wallet account.
 * Uses the wallet's active network to create the connection.
 *
 * @param wallet - Solana wallet account
 * @returns Solana Connection instance
 *
 * @example
 * ```tsx
 * const wallet = requireSolanaWallet();
 * const connection = await getSolanaConnection(wallet);
 * const balance = await connection.getBalance(new PublicKey(wallet.address));
 * ```
 */
export async function getSolanaConnection(wallet: SolanaWallet) {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");

  const { networkData } = await sdkGetActiveNetworkData({
    walletAccount: wallet,
  });

  if (!networkData) {
    throw new Error("No active network for Solana wallet");
  }

  return sdkGetSolanaConnection({ networkData });
}

// =============================================================================
// EMAIL OTP AUTHENTICATION
// =============================================================================

/**
 * Send email OTP for authentication
 * @param email - Email address to send OTP to
 */
export const sendEmailOTP = async (params: {
  email: string;
}): Promise<OTPVerification> => {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");

  // Wait for client to be fully initialized before sending OTP
  await sdkWaitForClientInitialized(client);

  return sdkSendEmailOTP({ email: params.email });
};

/**
 * Verify OTP code for email authentication
 * @param otpVerification - OTP verification object from sendEmailOTP
 * @param verificationToken - OTP code entered by user
 */
export const verifyOTP = async (params: {
  otpVerification: OTPVerification;
  verificationToken: string;
}): Promise<VerifyResponse> => {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");

  // Wait for client to be fully initialized before verifying OTP
  await sdkWaitForClientInitialized(client);

  return sdkVerifyOTP({
    otpVerification: params.otpVerification,
    verificationToken: params.verificationToken,
  });
};

/**
 * Get the current JWT token from the Dynamic client
 * @returns The JWT token string, or null if not available
 */
export const getJWTToken = (): string | null => {
  const client = getClient();
  if (!client) return null;

  // Access token property safely
  const token = client.token;
  return token || null;
};

/**
 * Alias for getJWTToken - get the current authentication token
 * @returns The JWT token string, or null if not available
 */
export const getAuthToken = getJWTToken;

// =============================================================================
// EXCHANGE / SOCIAL OAUTH FUNCTIONS
// =============================================================================

/**
 * Initiate social OAuth authentication (used for exchange connections like Kraken).
 * Redirects the user to the provider's authorization page.
 *
 * @param provider - Social provider identifier (e.g., "kraken")
 * @param redirectUrl - URL to redirect back to after authentication
 */
export const authenticateWithSocial = async (params: {
  provider: string;
  redirectUrl: string;
}): Promise<void> => {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");

  // Wait for client to be fully initialized before initiating OAuth
  await sdkWaitForClientInitialized(client);

  return sdkAuthenticateWithSocial({
    provider: params.provider as Parameters<
      typeof sdkAuthenticateWithSocial
    >[0]["provider"],
    redirectUrl: params.redirectUrl,
  });
};

/**
 * Detect if the current URL is an OAuth redirect return.
 * Call this on page load to check if the user just returned from an OAuth flow.
 *
 * @param url - The current page URL to check
 * @returns True if the URL contains OAuth redirect parameters
 */
export const detectOAuthRedirect = async (url?: URL): Promise<boolean> => {
  const client = getClient();
  if (!client) return false;

  try {
    await sdkWaitForClientInitialized(client);
    const currentUrl = url ?? new URL(window.location.href);
    return sdkDetectOAuthRedirect({ url: currentUrl });
  } catch {
    return false;
  }
};

/**
 * Complete the social authentication flow after OAuth redirect.
 * Processes the OAuth callback URL and authenticates the user.
 *
 * @param url - The callback URL containing OAuth response parameters
 * @returns The authenticated user or null
 */
export const completeSocialAuthentication = async (
  url?: URL,
): Promise<unknown> => {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");

  await sdkWaitForClientInitialized(client);
  const currentUrl = url ?? new URL(window.location.href);
  return sdkCompleteSocialAuthentication({ url: currentUrl });
};

// =============================================================================
// KRAKEN EXCHANGE FUNCTIONS
// =============================================================================

/**
 * Get the user's Kraken exchange accounts and balances.
 * Requires the user to have connected their Kraken account via OAuth.
 *
 * @param params - Optional filters (chainName, networkId)
 * @returns Array of Kraken accounts with balances
 */
export const getKrakenAccounts = async (
  params?: GetKrakenAccountsParams,
): Promise<KrakenAccount[]> => {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return sdkGetKrakenAccounts(params);
};

/**
 * Get Kraken whitelisted withdrawal addresses.
 * Used to check if address whitelisting is enforced and which addresses are approved.
 *
 * @returns Whitelisting enforcement status and approved destinations
 */
export const getKrakenWhitelistedAddresses =
  async (): Promise<TransferDestinationResponse> => {
    const client = getClient();
    if (!client) throw new Error("Dynamic client not initialized");
    return sdkGetKrakenWhitelistedAddresses();
  };

/**
 * Create a transfer from a Kraken exchange account to an external address.
 *
 * @param params - Transfer parameters (accountId, to, amount, currency, etc.)
 * @returns The transfer response with ID and status
 */
export const createKrakenExchangeTransfer = async (
  params: KrakenTransferRequest,
): Promise<ExchangeTransferResponse> => {
  const client = getClient();
  if (!client) throw new Error("Dynamic client not initialized");
  return sdkCreateKrakenExchangeTransfer(params);
};

// =============================================================================
// SOCIAL ACCOUNTS
// =============================================================================

/**
 * Social account type from the Dynamic SDK.
 */
export interface SocialAccount {
  accountId?: string;
  displayName?: string;
  emails: string[];
  photos: string[];
  provider: string;
  username?: string;
  verifiedCredentialId: string;
}

/**
 * Get all social accounts (exchanges, social logins) for the current user.
 * Used to detect which exchanges are connected (e.g., Kraken).
 *
 * @returns Array of social accounts, or empty array if not available
 */
export const getUserSocialAccounts = (): SocialAccount[] => {
  const client = getClient();
  if (!client) return [];
  try {
    return sdkGetUserSocialAccounts() as SocialAccount[];
  } catch {
    return [];
  }
};

export type {
  WalletAccount,
  WalletProviderData,
  DynamicInitStatus,
  Chain,
  OTPVerification,
  KrakenAccount,
  KrakenTransferRequest,
  ExchangeTransferResponse,
  TransferDestinationResponse,
  GetKrakenAccountsParams,
};
export type EvmWallet = EvmWalletAccount;
export type SolanaWallet = SolanaWalletAccount;
