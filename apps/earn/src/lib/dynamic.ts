/**
 * Dynamic JavaScript SDK Configuration (headless)
 *
 * Uses @dynamic-labs-sdk/client (JavaScript SDK), not the React SDK.
 * No DynamicContextProvider — we use a singleton client and manual init
 * via the DynamicInit component. This keeps full control over auth flow
 * and UI while using ZeroDev + EVM extensions.
 *
 * - Configures Google auth and Base Sepolia
 * - Auto-creates EVM embedded wallet on Google login
 * - addEvmExtension + addZerodevExtension for chains & gasless tx
 * - Event-based auth state sync with cookies
 *
 * Reference: https://www.dynamic.xyz/docs/javascript/reference/quickstart
 */

"use client";

import {
  createDynamicClient,
  initializeClient as sdkInitializeClient,
  authenticateWithSocial,
  type SocialProvider,
  isSignedIn,
  getPrimaryWalletAccount,
  logout as sdkLogout,
  waitForClientInitialized as sdkWaitForClientInitialized,
  getWalletAccounts as sdkGetWalletAccounts,
  getAvailableWalletProvidersData as sdkGetAvailableWalletProvidersData,
  connectAndVerifyWithWalletProvider as sdkConnectAndVerifyWithWalletProvider,
  onEvent as sdkOnEvent,
  offEvent as sdkOffEvent,
  getMultichainBalances as sdkGetMultichainBalances,
  type DynamicClient,
  type GetMultichainBalancesParams,
  type WalletAccount,
  type WalletProviderData,
} from "@dynamic-labs-sdk/client";
import {
  createWaasWalletAccounts,
  getChainsMissingWaasWalletAccounts,
  isWaasWalletAccount,
} from "@dynamic-labs-sdk/client/waas";
import { addEvmExtension } from "@dynamic-labs-sdk/evm";
import {
  connectAndVerifyWithWalletConnectEvm,
  connectWithWalletConnectEvm,
} from "@dynamic-labs-sdk/evm/wallet-connect";
import { addZerodevExtension } from "@dynamic-labs-sdk/zerodev";
import { env } from "@/env";

// Singleton Dynamic client instance
let dynamicClient: DynamicClient | null = null;

// Track if client has been explicitly initialized
let clientInitialized = false;

/**
 * Get or create the Dynamic client instance.
 * Networks (including Base Sepolia) must be enabled in the Dynamic Dashboard:
 * https://app.dynamic.xyz/dashboard/chains-and-networks
 * Otherwise you may see "No networks were registered in the client".
 */
export function getDynamicClient(): DynamicClient {
  // SSR guard - return null to prevent hydration mismatches
  if (typeof window === "undefined") {
    throw new Error(
      "Dynamic client can only be accessed in browser environment"
    );
  }

  if (!dynamicClient) {
    const environmentId = env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

    dynamicClient = createDynamicClient({
      environmentId,
      autoInitialize: false, // Explicit control - call initializeDynamic()
      metadata: {
        name: "Earn Dashboard",
        iconUrl: "",
      },
    });

    // Add EVM extension for Ethereum/Base Sepolia support
    // Networks are configured in the Dynamic Dashboard
    addEvmExtension(dynamicClient);

    // Add ZeroDev extension for account abstraction (gasless transactions)
    addZerodevExtension(dynamicClient);
  }

  return dynamicClient;
}

/**
 * Initialize the Dynamic client
 * With autoInitialize: false, this explicitly starts initialization
 */
export async function initializeDynamic() {
  const client = getDynamicClient();

  // Start initialization if not already done
  if (!clientInitialized) {
    clientInitialized = true;
    sdkInitializeClient(client);
  }

  // Wait for client to be fully initialized before proceeding
  await sdkWaitForClientInitialized(client);
}

/**
 * Wait for Dynamic client to be fully initialized
 */
export async function waitForClientInitialized(): Promise<void> {
  const client = getDynamicClient();
  return sdkWaitForClientInitialized(client);
}

/**
 * Sign in with Google
 * Redirects user to Google OAuth page
 *
 * Following Dynamic's recommended pattern: redirect back to the same page
 * where the user initiated login. The useCompleteSocialAuth hook on that
 * page will detect and complete the OAuth flow.
 */
export async function signInWithGoogle(redirectUrl?: string) {
  // Ensure client is created before authenticating
  getDynamicClient();
  // Redirect back to current page - useCompleteSocialAuth hook will complete the flow
  // This ensures /e/[id]/login returns to /e/[id]/login, not /login
  const redirect =
    redirectUrl || `${window.location.origin}${window.location.pathname}`;
  await authenticateWithSocial({
    provider: "google" as SocialProvider,
    redirectUrl: redirect,
  });
}

/**
 * Check if user is authenticated
 */
export function checkAuthStatus() {
  return isSignedIn();
}

/**
 * Get the current authenticated user
 */
export function getCurrentUser() {
  const client = getDynamicClient();
  return client.user;
}

/**
 * Get the primary wallet account
 */
export function getPrimaryWallet() {
  return getPrimaryWalletAccount();
}

/**
 * Get authentication token
 * Waits for client initialization if needed
 */
export async function getAuthToken(): Promise<string | null> {
  const client = getDynamicClient();
  // Ensure client is initialized before accessing token
  await sdkWaitForClientInitialized(client);
  return client.token || null;
}

/**
 * Setup auth event listeners for cookie sync
 *
 * The SDK handles token refresh internally - we just need to listen for
 * tokenChanged events and sync to cookies. No custom scheduling needed.
 *
 * @param onTokenChange - Callback when token changes (should update cookie)
 * @param onLogout - Callback when user logs out (should clear cookie)
 */
export function setupAuthEventListeners(callbacks: {
  onTokenChange?: (token: string | null) => void;
  onLogout?: () => void;
}): () => void {
  const unsubscribers: Array<(() => void) | null> = [];

  // Listen for token changes - SDK handles refresh internally
  const unsubToken = sdkOnEvent({
    event: "tokenChanged" as any,
    listener: (token: string | null) => {
      if (token) {
        callbacks.onTokenChange?.(token);
      } else {
        callbacks.onLogout?.();
      }
    },
  });
  unsubscribers.push(unsubToken || null);

  // Listen for logout events
  const unsubLogout = sdkOnEvent({
    event: "logout" as any,
    listener: () => {
      callbacks.onLogout?.();
    },
  });
  unsubscribers.push(unsubLogout || null);

  // Return cleanup function
  return () => {
    unsubscribers.forEach((unsub) => unsub?.());
  };
}

/**
 * Logout from Dynamic SDK
 */
export async function logout(): Promise<void> {
  try {
    await sdkLogout();
  } catch {
    // Continue with logout even if SDK logout fails
    // The cookie will still be cleared server-side
  }
}

/**
 * Get all wallet accounts
 */
export function getWalletAccounts(): WalletAccount[] {
  try {
    return sdkGetWalletAccounts() || [];
  } catch {
    return [];
  }
}

/**
 * Get available wallet providers
 */
export function getAvailableWalletProviders(): WalletProviderData[] {
  try {
    return sdkGetAvailableWalletProvidersData() || [];
  } catch {
    return [];
  }
}

/**
 * Connect and verify with a wallet provider
 */
export async function connectAndVerifyWithWalletProvider(params: {
  walletProviderKey: string;
}): Promise<void> {
  // Ensure client is created before connecting
  getDynamicClient();
  await sdkConnectAndVerifyWithWalletProvider(params);
}

/**
 * Check if a wallet is an embedded (WaaS) wallet
 */
export function isEmbeddedWallet(wallet: WalletAccount): boolean {
  return isWaasWalletAccount({ walletAccount: wallet });
}

/**
 * Check if a wallet is a browser extension wallet (MetaMask, Coinbase, etc.)
 * Excludes embedded wallets, ZeroDev smart wallets, and other non-browser wallets.
 */
export function isBrowserExtensionWallet(wallet: WalletAccount): boolean {
  // First, exclude embedded/WaaS wallets
  if (isEmbeddedWallet(wallet)) return false;

  const providerKey =
    (wallet as { walletProviderKey?: string }).walletProviderKey ?? "";
  const keyLower = providerKey.toLowerCase();

  // Exclude ZeroDev smart wallets
  if (keyLower.includes("zerodev")) return false;

  // Exclude other non-browser extension wallet types
  const excludedPatterns = [
    "embedded",
    "waas",
    "magic",
    "turnkey",
    "privy",
    "web3auth",
    "passkey",
    "sms",
    "email",
  ];

  for (const pattern of excludedPatterns) {
    if (keyLower.includes(pattern)) return false;
  }

  // Common browser extension wallet patterns (whitelist approach)
  const browserExtensionPatterns = [
    "metamask",
    "coinbase",
    "rainbow",
    "trust",
    "phantom",
    "brave",
    "rabby",
    "zerion",
    "frame",
    "tally",
    "walletconnect",
    "browserextension",
    "injected",
  ];

  // If it matches a known browser extension pattern, include it
  for (const pattern of browserExtensionPatterns) {
    if (keyLower.includes(pattern)) {
      return true;
    }
  }

  // For unknown wallets, include if they don't match excluded patterns
  // This catches generic browser extension wallets
  return true;
}

/**
 * Get the embedded wallet account if it exists
 * Returns null if no embedded wallet is found
 */
export function getEmbeddedWallet(): WalletAccount | null {
  try {
    const accounts = getWalletAccounts();
    return accounts.find((account) => isEmbeddedWallet(account)) || null;
  } catch {
    return null;
  }
}

/** WalletAccount has walletProviderKey; use it to detect ZeroDev smart wallet */
const ZERODEV_PROVIDER_KEY_MARKER = "zerodev";

/**
 * Get the ZeroDev smart wallet account if it exists.
 * createKernelClientForWalletAccount expects this (the smart wallet), not the embedded EOA.
 * Returns null if no ZeroDev smart wallet is found.
 */
export function getZerodevSmartWalletAccount(): WalletAccount | null {
  try {
    const accounts = getWalletAccounts();
    return (
      accounts.find(
        (account) =>
          "walletProviderKey" in account &&
          String(
            (account as { walletProviderKey?: string }).walletProviderKey ?? ""
          )
            .toLowerCase()
            .includes(ZERODEV_PROVIDER_KEY_MARKER)
      ) ?? null
    );
  } catch {
    return null;
  }
}

/**
 * Re-export WaaS wallet functions for convenience
 */
export { createWaasWalletAccounts, getChainsMissingWaasWalletAccounts };

/**
 * Subscribe to wallet events
 */
export function onWalletEvent(params: {
  event: string;
  listener: () => void;
}): (() => void) | null {
  try {
    // Cast event to any to work around strict typing
    return sdkOnEvent(params as any) || null;
  } catch {
    return null;
  }
}

/**
 * Get wallet display info from available providers.
 * Note: For wallet icons, use WalletIcon from @dynamic-labs/wallet-book instead.
 */
export function getWalletDisplayInfo(walletProviderKey?: string): {
  name: string;
  iconUrl?: string;
} {
  if (!walletProviderKey) return { name: "Wallet" };

  const providers = getAvailableWalletProviders();
  const provider = providers.find((p) => p.key === walletProviderKey);

  if (provider?.metadata) {
    return {
      name: provider.metadata.displayName || "Wallet",
      iconUrl: provider.metadata.icon,
    };
  }

  // Fallback: parse name from key
  const keyLower = walletProviderKey.toLowerCase();
  if (keyLower.includes("embedded") || keyLower.includes("waas")) {
    return { name: "Embedded Wallet" };
  }

  return { name: "Wallet" };
}

/**
 * Fetch multichain balances via Dynamic SDK.
 * Uses the singleton client and waits for initialization.
 * Returns the chainBalances array (see getMultichainBalances in SDK).
 */
export async function fetchMultichainBalances(params: {
  balanceRequest: {
    filterSpamTokens?: boolean;
    balanceRequests: Array<{
      address: string;
      chain: "EVM";
      networkIds: number[];
      whitelistedContracts?: string[];
    }>;
  };
}): Promise<unknown[]> {
  const client = getDynamicClient();
  await sdkWaitForClientInitialized(client);
  const result = await sdkGetMultichainBalances(
    params as GetMultichainBalancesParams,
    client
  );
  return (result ?? []) as unknown[];
}

/** Raw balance entry from getMultichainBalances response (one chain's networks) */
interface ChainBalanceRaw {
  networks?: Array<{
    networkId: number;
    balances?: Array<{ symbol?: string; balance?: string; address?: string }>;
  }>;
}

/**
 * Find a token balance from a chainBalances array (getMultichainBalances result).
 * @param chainBalances - Array returned by getMultichainBalances
 * @param networkId - e.g. 84532 for Base Sepolia
 * @param tokenAddress - Contract address (e.g. Dynamic USDC)
 */
export function findTokenBalanceInChainBalances(
  chainBalances: unknown,
  networkId: number,
  tokenAddress: string
): { balance: string; symbol: string } | null {
  const chains = Array.isArray(chainBalances) ? chainBalances : [];
  const needle = tokenAddress.toLowerCase();

  for (const chain of chains as ChainBalanceRaw[]) {
    for (const network of chain.networks ?? []) {
      if (network.networkId !== networkId) continue;
      for (const token of network.balances ?? []) {
        if (token.address?.toLowerCase() === needle) {
          return {
            balance: parseFloat(token.balance ?? "0").toFixed(2),
            symbol: token.symbol ?? "USDC",
          };
        }
      }
    }
  }
  return null;
}

/**
 * Connect wallet using WalletConnect protocol.
 * Returns a uri for QR code display and an approval promise.
 * @param autoVerify - If true, will also verify the wallet (sign a message)
 */
export async function connectWithWalletConnect(
  autoVerify: boolean = true
): Promise<{
  uri: string;
  approval: () => Promise<void>;
}> {
  const client = getDynamicClient();
  await sdkWaitForClientInitialized(client);

  const connect = autoVerify
    ? connectAndVerifyWithWalletConnectEvm
    : connectWithWalletConnectEvm;

  const { uri, approval } = await connect();

  return {
    uri,
    approval: async () => {
      await approval();
    },
  };
}

// Re-export types and utilities
export type { WalletAccount, WalletProviderData };
export { sdkOffEvent as offEvent };
