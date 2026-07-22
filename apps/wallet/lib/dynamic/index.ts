/**
 * Dynamic SDK — Barrel Export
 *
 * Re-exports all SDK wrapper functions organized by feature.
 * Each feature file is a self-contained reference for one SDK capability.
 *
 * Import from "@/lib/dynamic" in your components:
 * ```ts
 * import { getTransactionHistory, isSignedIn } from "@/lib/dynamic";
 * ```
 *
 * Or import from a specific feature file for focused reference:
 * ```ts
 * import { getTransactionHistory } from "@/lib/dynamic/transaction-history";
 * ```
 */

// Auth
export { isSignedIn, logout, getAuthenticatedIdentity } from "./auth";
export type { AuthenticatedIdentity } from "./auth";
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
  isWaasWalletAccount,
  isEvmWalletAccount,
  isSolanaWalletAccount,
  isSuiWalletAccount,
  isBitcoinWalletAccount,
  isTonWalletAccount,
} from "./wallets";

// Networks
export {
  getNetworksData,
  getActiveNetworkData,
  switchActiveNetwork,
} from "./networks";

// Balance
export { getBalance, getTokenBalances } from "./balance";
export type { TokenBalanceInfo } from "./balance";

// Transaction History
export { getTransactionHistory } from "./transaction-history";

// Key-share backup (Google Drive) + export
export {
  backupWaasKeySharesToGoogleDrive,
  getGoogleDriveBackupReadiness,
  isInsufficientGoogleDriveScopesError,
  isWalletBackedUpToGoogleDrive,
  markWalletBackedUpToGoogleDrive,
} from "./backup";
export {
  exportWaasClientKeyshares,
  exportWaasPrivateKey,
  hasDownloadedShare,
  markShareDownloaded,
} from "./export-key";

// Wallet Provider
export { getWalletProviderDataByKey } from "./wallet-provider";

// EVM
export { createWalletClientForWalletAccount } from "./evm";

// Solana
export {
  signAndSendTransaction,
  signAndSendSponsoredTransaction,
  SponsorTransactionError,
} from "./solana";

// ZeroDev (Account Abstraction)
export {
  createKernelClientForWalletAccount,
  isGasSponsorshipError,
  canSponsorUserOperation,
  signEip7702Authorization,
} from "./zerodev";

// Gas Sponsorship Config
export {
  getSponsoredNetworkIds,
  isNetworkSponsored,
  isSvmGasSponsorshipEnabled,
} from "./gas-sponsorship";

// MFA
export {
  authenticateTotpMfaDevice,
  getMfaDevices,
  registerTotpMfaDevice,
  isMfaRequiredForAction,
  getMfaSettings,
  MFAAction,
} from "./mfa";

// Events
export { onEvent, offEvent } from "./events";

// Initialization
export { getInitStatus, waitForClientInitialized } from "./init";

// Types
export type {
  WalletAccount,
  EvmWalletAccount,
  SolanaWalletAccount,
  SuiWalletAccount,
  BitcoinWalletAccount,
  TonWalletAccount,
  Chain,
} from "./wallets";
export type { NetworkData } from "./networks";
export type { OTPVerification } from "@dynamic-labs-sdk/client";
export type {
  GetTransactionHistoryParams,
  GetTransactionHistoryResponse,
} from "./transaction-history";
export type { InitStatus } from "./init";
export type { MfaSettings } from "./mfa";
