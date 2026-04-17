/**
 * Dynamic SDK — Barrel Export (EVM-only for Visa Direct)
 */

// Auth
export { isSignedIn, logout, refreshAuth } from "./auth";
export { isEmailAuthEnabled, sendEmailOTP, verifyOTP } from "./auth-email";
export {
  authenticateWithSocial,
  detectOAuthRedirect,
  completeSocialAuthentication,
  getEnabledSocialProviders,
  isSocialAuthEnabled,
} from "./auth-social";
export { signInWithExternalJwt, isExternalAuthEnabled } from "./auth-jwt";

// Wallets
export {
  getWalletAccounts,
  isEvmWalletAccount,
  isZerodevWalletAccount,
  isWaasWalletAccount,
  getPrimarySmartEvmAccount,
  getExternalEvmWalletAccount,
  createWaasWalletAccounts,
  getChainsMissingWaasWalletAccounts,
} from "./wallets";

// External wallet providers (MetaMask, Coinbase Wallet, WalletConnect, …)
export {
  getAvailableWalletProviders,
  connectAndVerifyWithWalletProvider,
  type WalletProviderData,
} from "./providers";

// Networks
export {
  getNetworksData,
  getActiveNetworkData,
  switchActiveNetwork,
  ensureSepoliaNetwork,
  findSepoliaNetwork,
} from "./networks";

// EVM (viem bridge)
export { createWalletClientForWalletAccount } from "./evm";

// Balances
export { getTokenBalances, type TokenBalanceInfo } from "./balance";

// Kraken (CeFi connector)
export {
  getKrakenAccounts,
  getKrakenDepositAddresses,
  getUserSocialAccounts,
  isKrakenConnected,
  getKrakenSocialAccount,
  type KrakenAccount,
  type GetKrakenAccountsParams,
  type KrakenDepositAddress,
  type GetKrakenDepositAddressesParams,
  type SocialAccount,
} from "./kraken";

// Exchange discovery (CeFi connector registry)
export { getAvailableExchanges, type AvailableExchange } from "./exchanges";

// Events
export { onEvent, offEvent } from "./events";

// Auth token (for API calls)
export { getAuthToken, getUserName } from "./auth-token";

// Initialization
export { getInitStatus, waitForClientInitialized } from "./init";

// Types
export type { WalletAccount, EvmWalletAccount } from "./wallets";
export type { NetworkData } from "./networks";
export type { OTPVerification } from "@dynamic-labs-sdk/client";
export type { InitStatus } from "./init";
