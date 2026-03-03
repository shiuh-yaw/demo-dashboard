/**
 * Dynamic SDK — Barrel Export (EVM-only for remittance)
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
  createWaasWalletAccounts,
  getChainsMissingWaasWalletAccounts,
  isWaasWalletAccount,
  isEvmWalletAccount,
  exportWaasPrivateKey,
} from "./wallets";

// Networks
export {
  getNetworksData,
  getActiveNetworkData,
  switchActiveNetwork,
} from "./networks";

// EVM
export { createWalletClientForWalletAccount } from "./evm";

// ZeroDev (Account Abstraction)
export {
  createKernelClientForWalletAccount,
  isGasSponsorshipError,
  canSponsorUserOperation,
} from "./zerodev";

// Gas Sponsorship Config
export { getSponsoredNetworkIds, isNetworkSponsored } from "./gas-sponsorship";

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
