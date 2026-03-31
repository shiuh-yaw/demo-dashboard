/**
 * Dynamic SDK -- Barrel Export (EVM-only for trade)
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
  getPrimaryWalletAccount,
  createWaasWalletAccounts,
  getChainsMissingWaasWalletAccounts,
  isWaasWalletAccount,
  isEvmWalletAccount,
} from "./wallets";

// Networks
export {
  getNetworksData,
  getActiveNetworkData,
  switchActiveNetwork,
  addNetwork,
} from "./networks";

// EVM (viem wallet client for transactions)
export { createWalletClientForWalletAccount } from "./evm";

// Events
export { onEvent, offEvent } from "./events";

// Auth token (for API calls)
export { getAuthToken } from "./auth-token";

// Initialization
export { getInitStatus, waitForClientInitialized } from "./init";

// Types
export type { WalletAccount, EvmWalletAccount, Chain } from "./wallets";
export type { NetworkData } from "./networks";
export type { OTPVerification } from "@dynamic-labs-sdk/client";
export type { InitStatus } from "./init";
